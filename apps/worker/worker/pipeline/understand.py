"""Understand Pipeline Stage.

Implements Stage 3 (CLASSIFY), Stage 4 (EXTRACT), and Stage 5 (VALIDATE + FIELD-TO-BBOX MAPPING).
Rule 3: Auto-detect flow: classify first.
If known, run schema extractor; else run generic DISCOVERY.
Rule 11: Prompt-injection defense delimiters.
"""

import json
import re
from pathlib import Path
from typing import Any

from app.config import settings
from app.logging import logger

from providers.base import (
    BoundingBox,
    ClassificationResult,
    ExtractedField,
    ExtractionResult,
    LLMProvider,
    ParsedBlock,
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

    # 3. FIELD-TO-BBOX MAPPING
    extraction.fields = map_fields_to_bboxes(extraction.fields, blocks)

    return classification, extraction
