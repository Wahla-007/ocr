"""Ollama Vision Provider for Air-Gapped / Self-Hosted Deployments.

Implements the VisionProvider Protocol using a local Ollama instance exposing
an OpenAI-compatible /v1 endpoint (default http://127.0.0.1:11434/v1).

Features:
- Pure local execution with zero internet egress.
- Compatible with multimodal open weights models (qwen2.5vl, llama3.2-vision).
- Resilient JSON mode: uses `response_format={"type": "json_object"}`.
- Markdown fence stripper & JSON repair prompt retry on malformed outputs.
- Deterministic multi-page chunking & merge policy.
- Zero-knowledge logging: never logs base64 images or extracted values.
"""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

import httpx

from providers.llm.omniroute import (
    OmniRouteVisionProvider,
)

logger = logging.getLogger(__name__)

DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434/v1"
DEFAULT_OLLAMA_MODEL = "qwen2.5vl"


def clean_json_markdown(text: str) -> str:
    """Strips markdown code fences and extracts raw JSON object."""
    trimmed = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", trimmed)
    if match:
        return match.group(1).strip()
    return trimmed


class OllamaVisionProvider(OmniRouteVisionProvider):
    """Air-gapped Vision Provider communicating with a local Ollama instance."""

    def __init__(
        self,
        base_url: str = DEFAULT_OLLAMA_BASE_URL,
        api_key: str = "ollama",
        default_model: str = DEFAULT_OLLAMA_MODEL,
        max_pages_per_chunk: int = 6,
        timeout: float = 120.0,
        http_client: httpx.AsyncClient | None = None,
    ):
        super().__init__(
            base_url=base_url,
            api_key=api_key or "ollama",
            default_model=default_model or DEFAULT_OLLAMA_MODEL,
            max_pages_per_chunk=max_pages_per_chunk,
            timeout=timeout,
            http_client=http_client,
        )

    async def _call_model_with_backoff(
        self,
        messages: list[dict[str, Any]],
        response_format: dict[str, Any] | None,
        model: str,
    ) -> tuple[dict[str, Any], int, int, float]:
        """Calls Ollama via AsyncOpenAI client with json_object mode and JSON repair."""
        start_time = time.monotonic()
        target_model = model or self.default_model

        ollama_format: dict[str, Any] = {"type": "json_object"}

        try:
            resp = await self.client.chat.completions.create(
                model=target_model,
                messages=messages,  # type: ignore[arg-type]
                response_format=ollama_format,  # type: ignore[arg-type]
                temperature=0.0,
            )
            raw_content = resp.choices[0].message.content or "{}"
            cleaned_json_str = clean_json_markdown(raw_content)

            p_tokens = resp.usage.prompt_tokens if resp.usage else 0
            c_tokens = resp.usage.completion_tokens if resp.usage else 0
            latency = round((time.monotonic() - start_time) * 1000, 2)

            try:
                parsed = json.loads(cleaned_json_str)
            except json.JSONDecodeError:
                logger.warning("Ollama output was not valid JSON; triggering repair attempt.")
                repair_messages = [
                    {
                        "role": "system",
                        "content": "You are a JSON repair tool. Output only the valid, corrected JSON object with no surrounding text or formatting.",
                    },
                    {
                        "role": "user",
                        "content": f"Fix and return only valid JSON for:\n{raw_content}",
                    },
                ]
                repair_resp = await self.client.chat.completions.create(
                    model=target_model,
                    messages=repair_messages,  # type: ignore[arg-type]
                    response_format={"type": "json_object"},  # type: ignore[arg-type]
                    temperature=0.0,
                )
                repaired_content = repair_resp.choices[0].message.content or "{}"
                parsed = json.loads(clean_json_markdown(repaired_content))
                if repair_resp.usage:
                    p_tokens += repair_resp.usage.prompt_tokens
                    c_tokens += repair_resp.usage.completion_tokens

            return parsed, p_tokens, c_tokens, latency

        except Exception as exc:
            logger.warning(f"Ollama local vision model call failed on '{target_model}': {exc}")
            raise
