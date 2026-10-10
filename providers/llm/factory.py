"""LLM Provider factory for vendor isolation.

Rule 4: All LLM vendors sit behind LLMProvider inside /providers.
Switching vendors must be an env/config change.
"""

import logging
import os

from providers.base import LLMProvider
from providers.llm.gemini_provider import GeminiLLMProvider
from providers.llm.mock_provider import MockLLMProvider

logger = logging.getLogger("openocr.providers.llm")

_PROVIDER_REGISTRY: dict[str, type[LLMProvider]] = {
    "gemini": GeminiLLMProvider,
    "mock": MockLLMProvider,
}


def get_llm_provider(provider_name: str | None = None) -> LLMProvider:
    """Instantiates LLMProvider based on configuration name."""
    name = (provider_name or os.environ.get("LLM_PROVIDER", "gemini")).lower().strip()
    if name == "gemini" and not os.environ.get("GEMINI_API_KEY"):
        logger.info("GEMINI_API_KEY not set. Using MockLLMProvider for local dev/testing.")
        return MockLLMProvider()

    provider_cls = _PROVIDER_REGISTRY.get(name, MockLLMProvider)
    return provider_cls()
