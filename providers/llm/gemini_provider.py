"""Google Gemini LLM Provider implementation.

Rule 4: Vendor isolation. All LLM SDK interaction sits strictly behind LLMProvider.
Rule 11: Prompt-injection defense: text from documents is untrusted DATA.
"""

import json
import os
import re
from typing import Any

import httpx

from providers.base import (
    ClassificationResult,
    ExtractedField,
    ExtractionResult,
    LLMProvider,
)


class GeminiLLMProvider(LLMProvider):
    """Gemini Provider communicating with Google Generative AI API."""

    def __init__(self, api_key: str | None = None, model: str = "gemini-1.5-flash"):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "")
        self.model = model
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    @property
    def provider_name(self) -> str:
        return "gemini"

    def _clean_json_output(self, raw_text: str) -> dict[str, Any]:
        """Strips markdown code fences and parses JSON payload."""
        text = raw_text.strip()
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if match:
            text = match.group(1).strip()
        return json.loads(text)

    async def _generate(self, prompt: str) -> str:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")

        url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
                "topP": 0.95,
                "responseMimeType": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"Gemini API error ({resp.status_code}): {resp.text}")

            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise RuntimeError("No generation candidates returned from Gemini.")

            return candidates[0]["content"]["parts"][0]["text"]

    async def classify(
        self,
        compact_text: str,
        first_page_image_bytes: bytes | None = None,
        prompt_template: str | None = None,
    ) -> ClassificationResult:
        """Classify document type using parsed text with prompt injection defense."""
        if not prompt_template:
            # Fallback default prompt if file not loaded
            prompt_template = (
                "You are a document classifier. Output JSON with {doc_type, confidence}.\n"
                "<UNTRUSTED_DOCUMENT_CONTENT>\n{{DOCUMENT_TEXT}}\n</UNTRUSTED_DOCUMENT_CONTENT>"
            )

        rendered_prompt = prompt_template.replace("{{DOCUMENT_TEXT}}", compact_text[:8000])
        response_text = await self._generate(rendered_prompt)
        parsed = self._clean_json_output(response_text)

        return ClassificationResult(
            doc_type=parsed.get("doc_type", "unknown"),
            confidence=float(parsed.get("confidence", 0.90)),
            reasoning=parsed.get("reasoning"),
        )

    async def extract(
        self,
        doc_type: str,
        parsed_text: str,
        schema_definition: dict[str, Any],
        prompt_template: str,
    ) -> ExtractionResult:
        """Extract structured fields adhering to schema definition."""
        rendered_prompt = prompt_template.replace("{{DOCUMENT_TEXT}}", parsed_text[:20000])
        response_text = await self._generate(rendered_prompt)
        parsed = self._clean_json_output(response_text)

        fields_data = []
        for f in parsed.get("fields", []):
            fields_data.append(
                ExtractedField(
                    key=f.get("key", "field"),
                    label=f.get("label", "Field"),
                    value=f.get("value"),
                    confidence=float(f.get("confidence", 0.95)),
                )
            )

        return ExtractionResult(
            doc_type=doc_type,
            doc_type_confidence=0.98,
            overall_confidence=float(parsed.get("confidence", 0.95)),
            fields=fields_data,
            summary=parsed.get("summary", ""),
            provider_name=self.provider_name,
            model_name=self.model,
            prompt_version="v1",
        )
