"""Understand Pipeline Stage.

Implements Stage 3 (CLASSIFY), Stage 4 (EXTRACT), and Stage 5 (VALIDATE + FIELD-TO-BBOX MAPPING).
Rule 3: Auto-detect flow: classify first.
If known, run schema extractor; else run generic DISCOVERY.
Rule 11: Prompt-injection defense delimiters.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from worker.pipeline.escalation import EscalationPolicy

from app.config import settings
from app.logging import logger

from providers.base import (
    BoundingBox,
    ClassificationResult,
    ExtractedField,
    ExtractionResult,
    LLMProvider,
    ParsedBlock,
    RasterPage,
    ValidationIssue,
    VisionProvider,
    VisionResult,
)
from providers.llm.factory import get_llm_provider

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent
PROMPTS_DIR = ROOT_DIR / "prompts"
SCHEMAS_DIR = ROOT_DIR / "schemas"


def load_prompt_template(filename: str) -> str:
    path = PROMPTS_DIR / filename
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return f.read()
    logger.warning(f"Prompt template {filename} not found at {path}, using fallback.")
    return (
        "Extract document details:\n"
        "<UNTRUSTED_DOCUMENT_CONTENT>\n{{DOCUMENT_TEXT}}\n</UNTRUSTED_DOCUMENT_CONTENT>"
    )


def load_json_schema(doc_type: str) -> dict[str, Any] | None:
    path = SCHEMAS_DIR / f"{doc_type}.json"
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return None


def map_fields_to_bboxes(
    fields: list[ExtractedField],
    blocks: list[ParsedBlock],
) -> list[ExtractedField]:
    """Maps extracted semantic field values back to parsed layout blocks to attach

    pixel-accurate bounding boxes and page numbers.
    """
    for field in fields:
        if field.bbox is not None:
            continue

        val_str = str(field.value).strip().lower()
        if not val_str or len(val_str) < 2:
            continue

        # Look for matching block containing the value
        matched_block: ParsedBlock | None = None

        # Clean string for comparison (remove punctuation/spaces)
        val_clean = re.sub(r"[^\w]", "", val_str)

        for block in blocks:
            block_text_lower = block.text.lower()
            block_clean = re.sub(r"[^\w]", "", block_text_lower)

            # Substring match on text or sanitized text
            if val_str in block_text_lower or (val_clean and val_clean in block_clean):
                matched_block = block
                break

        if matched_block and matched_block.bbox:
            field.page = matched_block.page
            field.bbox = BoundingBox(
                x=matched_block.bbox.x,
                y=matched_block.bbox.y,
                width=matched_block.bbox.width,
                height=matched_block.bbox.height,
            )

    return fields


async def classify_and_extract(
    parsed_text: str,
    blocks: list[ParsedBlock],
    llm_provider: LLMProvider | None = None,
) -> tuple[ClassificationResult, ExtractionResult]:
    """Runs complete Understand stage: Classify -> Extract -> Map bboxes."""
    provider = llm_provider or get_llm_provider(settings.LLM_PROVIDER)

    # 1. CLASSIFY
    classify_prompt = load_prompt_template("classify.v1.md")
    classification = await provider.classify(
        compact_text=parsed_text[:8000],
        prompt_template=classify_prompt,
    )
    doc_type = classification.doc_type
    logger.info(f"Classified document as '{doc_type}' with confidence {classification.confidence}")

    # 2. EXTRACT (Known schema extractor vs Discovery extractor)
    schema = load_json_schema(doc_type)

    if schema is not None:
        prompt_filename = f"extract.{doc_type}.v1.md"
        extract_prompt = load_prompt_template(prompt_filename)
        logger.info(
            f"Running specialized schema extractor for '{doc_type}' using {prompt_filename}"
        )
    else:
        extract_prompt = load_prompt_template("discover.v1.md")
        schema = {"type": "object", "properties": {}}
        logger.info(f"Running generic discovery extractor for unknown document type '{doc_type}'")

    extraction = await provider.extract(
        doc_type=doc_type,
        parsed_text=parsed_text,
        schema_definition=schema,
        prompt_template=extract_prompt,
    )

    # Filter out missing/empty fields across all document types
    extraction.fields = [
        f for f in extraction.fields if f.value is not None and str(f.value).strip() != ""
    ]

    # 3. FIELD-TO-BBOX MAPPING
    extraction.fields = map_fields_to_bboxes(extraction.fields, blocks)

    return classification, extraction


async def understand_document_vision(
    pages: list[RasterPage],
    schema_type: str | None = None,
    vision_provider: VisionProvider | None = None,
    escalation_policy: EscalationPolicy | None = None,
    with_boxes: bool = True,
) -> tuple[str, list[dict[str, Any]], VisionResult, list[ValidationIssue], float]:
    """Executes Vision Understanding Pipeline (Stage 3 & Stage 4):

    - Auto-classifies doc_type if not specified.
    - Escalates models according to EscalationPolicy on deterministic errors.
    - Validates business rules (MRZ check digits, arithmetic balance).
    - Computes objective quality score.
    - Enriches fields with bounding boxes and digital PDF text-layer snapping.
    """
    from worker.pipeline.bbox import enrich_fields_with_boxes
    from worker.pipeline.escalation import EscalationPolicy
    from worker.pipeline.quality import calculate_quality_score
    from worker.validators import validate_document_fields

    from providers.llm.factory import get_vision_provider

    provider = vision_provider or get_vision_provider()
    policy = escalation_policy or EscalationPolicy()

    # 1. Resolve Document Type
    resolved_type = schema_type
    if not resolved_type or resolved_type.lower() == "auto":
        try:
            classification = await provider.classify(pages)
            resolved_type = classification.doc_type
            logger.info(f"Vision model classified document as '{resolved_type}' (confidence={classification.confidence})")
        except Exception as exc:
            logger.warning(f"Vision classification failed, defaulting to 'invoice': {exc}")
            resolved_type = "invoice"

    # 2. Extraction with Escalation Policy Loop
    best_vision_result: VisionResult | None = None
    best_issues: list[ValidationIssue] = []
    raw_fields: dict[str, Any] = {}
    raw_boxes: list[dict[str, Any]] = []

    for attempt in range(policy.max_attempts):
        model_for_attempt = policy.get_model_for_attempt(attempt)
        logger.info(f"Vision extraction attempt {attempt + 1}/{policy.max_attempts} with model '{model_for_attempt}'")

        try:
            vision_result = await provider.extract(
                pages=pages,
                doc_type=resolved_type,
                model=model_for_attempt,
                with_boxes=with_boxes,
            )
            best_vision_result = vision_result

            extracted_data = vision_result.extracted_data or {}
            raw_fields = extracted_data.get("fields", {})
            raw_boxes = extracted_data.get("boxes", [])

            # Deterministic business validation
            issues = validate_document_fields(resolved_type, raw_fields)
            best_issues = issues

            has_error = any(i.severity == "error" for i in issues)
            if has_error and policy.can_escalate(attempt):
                next_model = policy.get_next_model(attempt)
                logger.warning(
                    f"Attempt {attempt + 1} with '{model_for_attempt}' produced validation errors; "
                    f"escalating to '{next_model}'."
                )
                continue
            else:
                # Success or last allowed attempt
                break

        except Exception as exc:
            logger.warning(f"Attempt {attempt + 1} failed with exception: {exc}")
            if policy.can_escalate(attempt):
                continue
            raise

    if best_vision_result is None:
        raise RuntimeError("Vision extraction failed across all escalation attempts.")

    # 3. Quality score calculation
    quality_score = calculate_quality_score(raw_fields, best_issues, doc_type=resolved_type)

    # 4. Bounding box coordinate conversion and text-layer snapping
    enriched_fields = enrich_fields_with_boxes(raw_fields, raw_boxes, pages)

    return resolved_type, enriched_fields, best_vision_result, best_issues, quality_score
