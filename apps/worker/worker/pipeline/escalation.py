"""Model Escalation Policy and Retry Controller (Stage 3).

Controls deterministic multi-attempt escalation across vision models:
1. Primary: Default model (e.g. gemini/gemini-2.5-flash).
2. Escalation: Complex reasoning model (e.g. gemini/gemini-2.5-pro) on validation error.
3. Fallback: Smart router alias (e.g. auto).
4. Maximum attempts capped at 3 per chunk.
All model names and escalation chains are environment-configurable.
"""

from __future__ import annotations

import logging
from collections.abc import Sequence

from worker.config import worker_settings

logger = logging.getLogger(__name__)

DEFAULT_ESCALATION_CHAIN = [
    "gemini/gemini-2.5-flash",
    "gemini/gemini-2.5-pro",
    "auto",
]
MAX_ATTEMPTS_HARD_CAP = 3


class EscalationExhaustedError(Exception):
    """Raised when all models in the escalation chain have failed validation."""

    def __init__(self, message: str, attempts: int, last_model: str):
        super().__init__(message)
        self.attempts = attempts
        self.last_model = last_model


class EscalationPolicy:
    """Manages the model progression and circuit breaker for vision extraction."""

    def __init__(self, chain: Sequence[str] | None = None, max_attempts: int = MAX_ATTEMPTS_HARD_CAP):
        if chain is None:
            raw_chain = getattr(worker_settings, "OMNIROUTE_MODEL_CHAIN", "")
            if raw_chain:
                self.chain = [m.strip() for m in raw_chain.split(",") if m.strip()]
            else:
                self.chain = list(DEFAULT_ESCALATION_CHAIN)
        else:
            self.chain = list(chain)

        if not self.chain:
            self.chain = list(DEFAULT_ESCALATION_CHAIN)

        self.max_attempts = min(max_attempts, len(self.chain), MAX_ATTEMPTS_HARD_CAP)

    def get_model_for_attempt(self, attempt_index: int) -> str:
        """Returns the model string for a given attempt (0-indexed)."""
        idx = min(attempt_index, len(self.chain) - 1)
        return self.chain[idx]

    def can_escalate(self, current_attempt_index: int) -> bool:
        """Checks if another escalation attempt is permitted."""
        return (current_attempt_index + 1) < self.max_attempts

    def get_next_model(self, current_attempt_index: int) -> str | None:
        """Returns the next model in the chain if escalation is allowed, else None."""
        if not self.can_escalate(current_attempt_index):
            return None
        return self.get_model_for_attempt(current_attempt_index + 1)
