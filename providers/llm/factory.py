"""LLM Provider factory for vendor isolation.

Rule 4: All LLM vendors sit behind LLMProvider inside /providers.
Switching vendors must be an env/config change.
"""

import logging
import os

from providers.base import LLMProvider, VisionProvider
from providers.llm.gemini_provider import GeminiLLMProvider
from providers.llm.mock_provider import MockLLMProvider
from providers.llm.omniroute import OmniRouteVisionProvider

logger = logging.getLogger("openocr.providers.llm")

_PROVIDER_REGISTRY: dict[str, type[LLMProvider]] = {
    "gemini": GeminiLLMProvider,
    "mock": MockLLMProvider,
}


def get_llm_provider(provider_name: str | None = None) -> LLMProvider:
    """Instantiates legacy text LLMProvider based on configuration name."""
    name = (provider_name or os.environ.get("LLM_PROVIDER", "gemini")).lower().strip()
    if name == "gemini" and not os.environ.get("GEMINI_API_KEY"):
        logger.info("GEMINI_API_KEY not set. Using MockLLMProvider for local dev/testing.")
        return MockLLMProvider()

    provider_cls = _PROVIDER_REGISTRY.get(name, MockLLMProvider)
    return provider_cls()


def get_vision_provider(
    provider_name: str | None = None,
    base_url: str | None = None,
    api_key: str | None = None,
    default_model: str | None = None,
    max_pages_per_chunk: int | None = None,
) -> VisionProvider:
    """Instantiates multimodal VisionProvider based on configuration."""
    name = (provider_name or os.environ.get("PROVIDER", "omniroute")).lower().strip()

    resolved_base_url = (
        base_url
        or os.environ.get("OMNIROUTE_BASE_URL")
        or "http://127.0.0.1:20128/v1"
    )
    resolved_api_key = (
        api_key
        or os.environ.get("OMNIROUTE_API_KEY")
        or "sk-openocr-worker-live-2026"
    )
    resolved_model = (
        default_model
        or (os.environ.get("OMNIROUTE_MODEL_CHAIN", "gemini/gemini-2.5-flash").split(",")[0].strip())
        or "gemini/gemini-2.5-flash"
    )
    resolved_chunk_size = int(
        max_pages_per_chunk or os.environ.get("VISION_MAX_PAGES_PER_CHUNK", 6)
    )

    if name in ("omniroute", "openai"):
        return OmniRouteVisionProvider(
            base_url=resolved_base_url,
            api_key=resolved_api_key,
            default_model=resolved_model,
            max_pages_per_chunk=resolved_chunk_size,
        )
    elif name == "ollama":
        # Ollama local vision provider using OpenAI-compatible interface
        ollama_url = (
            base_url
            or os.environ.get("OLLAMA_BASE_URL")
            or "http://127.0.0.1:11434/v1"
        )
        ollama_model = default_model or os.environ.get("OLLAMA_MODEL", "qwen2.5vl")
        return OmniRouteVisionProvider(
            base_url=ollama_url,
            api_key="ollama",  # Ollama accepts any non-empty key
            default_model=ollama_model,
            max_pages_per_chunk=resolved_chunk_size,
        )

    # Default to OmniRoute
    return OmniRouteVisionProvider(
        base_url=resolved_base_url,
        api_key=resolved_api_key,
        default_model=resolved_model,
        max_pages_per_chunk=resolved_chunk_size,
    )
