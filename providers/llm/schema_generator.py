"""Schema-to-Strict-JSON-Schema Generator for Multimodal Vision Models (Stage 3).

Transforms OpenOCR registry schemas (Invoice, Passport, Receipt, ID, Bank Statement, Resume)
into OpenAI-compatible strict JSON schema format (`response_format={"type": "json_schema", ...}`).
Supports bounding box enrichment (`with_boxes=True`) requesting `box_2d` [ymin, xmin, ymax, xmax] (0-1000).
"""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

SCHEMAS_DIR = Path(__file__).resolve().parent.parent.parent / "schemas"

# Supported canonical document types
CANONICAL_DOC_TYPES = {
    "invoice",
    "receipt",
    "passport",
    "national_id",
    "id_card",
    "driving_licence",
    "bank_statement",
    "resume",
}

# Mapping aliases to canonical schema file names
SCHEMA_FILE_MAP = {
    "invoice": "invoice.json",
    "receipt": "receipt.json",
    "passport": "passport.json",
    "national_id": "id_card.json",
    "national_id_card": "id_card.json",
    "id_card": "id_card.json",
    "driving_licence": "driving_licence.json",
    "bank_statement": "bank_statement.json",
    "resume": "resume.json",
}


def _load_raw_schema(doc_type: str) -> dict[str, Any]:
    """Loads raw json schema file from schemas directory."""
    filename = SCHEMA_FILE_MAP.get(doc_type.lower())
    if not filename:
        filename = "invoice.json"  # Safe default fallback

    schema_path = SCHEMAS_DIR / filename
    if not schema_path.exists():
        schema_path = SCHEMAS_DIR / "invoice.json"

    with open(schema_path, "r", encoding="utf-8") as f:
        return json.load(f)


def _make_strict_compliant(schema_obj: dict[str, Any]) -> dict[str, Any]:
    """Recursively converts a standard JSON Schema into OpenAI strict JSON schema format.

    Rules for OpenAI strict schemas:
    1. Every object must have `additionalProperties: false`.
    2. Every property in `properties` must be in `required`.
    3. Nullable fields must specify `type: [<type>, "null"]`.
    """
    strict_schema = copy.deepcopy(schema_obj)

    # Strip top-level metadata not accepted by OpenAI strict format
    for key in ("$schema", "$id", "title"):
        strict_schema.pop(key, None)

    schema_type = strict_schema.get("type")

    if schema_type == "object" or "properties" in strict_schema:
        strict_schema["type"] = "object"
        strict_schema["additionalProperties"] = False

        properties = strict_schema.get("properties", {})
        existing_required = set(strict_schema.get("required", []))
        all_prop_keys = list(properties.keys())

        for prop_name, prop_val in properties.items():
            if isinstance(prop_val, dict):
                # Recurse into child object or array
                properties[prop_name] = _make_strict_compliant(prop_val)

                # If property was not originally required, allow null
                if prop_name not in existing_required:
                    curr_type = properties[prop_name].get("type")
                    if isinstance(curr_type, str) and curr_type != "null":
                        properties[prop_name]["type"] = [curr_type, "null"]
                    elif isinstance(curr_type, list) and "null" not in curr_type:
                        properties[prop_name]["type"] = curr_type + ["null"]

        strict_schema["properties"] = properties
        strict_schema["required"] = all_prop_keys

    elif schema_type == "array" and "items" in strict_schema:
        if isinstance(strict_schema["items"], dict):
            strict_schema["items"] = _make_strict_compliant(strict_schema["items"])

    return strict_schema


def get_extraction_json_schema(
    doc_type: str,
    with_boxes: bool = True,
) -> dict[str, Any]:
    """Generates an OpenAI-compatible strict JSON schema response_format definition.

    When `with_boxes=True`, prompts model to emit field values and normalized
    `box_2d` coordinates [ymin, xmin, ymax, xmax] (0-1000) per field and page.
    """
    raw_schema = _load_raw_schema(doc_type)
    strict_fields_schema = _make_strict_compliant(raw_schema)

    if not with_boxes:
        return {
            "type": "json_schema",
            "json_schema": {
                "name": f"{doc_type}_extraction",
                "strict": True,
                "schema": strict_fields_schema,
            },
        }

    # Schema definition including field values and bounding box annotations
    boxes_schema: dict[str, Any] = {
        "type": "array",
        "description": "List of bounding box coordinates for extracted fields",
        "items": {
            "type": "object",
            "properties": {
                "field": {
                    "type": "string",
                    "description": "The name of the field this bounding box corresponds to",
                },
                "page": {
                    "type": "integer",
                    "description": "1-indexed page number where this field is located",
                },
                "box_2d": {
                    "type": "array",
                    "description": "Normalized bounding box [ymin, xmin, ymax, xmax] scaled 0 to 1000",
                    "items": {"type": "integer"},
                },
            },
            "required": ["field", "page", "box_2d"],
            "additionalProperties": False,
        },
    }

    combined_schema = {
        "type": "object",
        "properties": {
            "fields": strict_fields_schema,
            "boxes": boxes_schema,
        },
        "required": ["fields", "boxes"],
        "additionalProperties": False,
    }

    return {
        "type": "json_schema",
        "json_schema": {
            "name": f"{doc_type}_extraction_with_boxes",
            "strict": True,
            "schema": combined_schema,
        },
    }


def get_classification_json_schema() -> dict[str, Any]:
    """Generates strict JSON schema for document classification step."""
    schema = {
        "type": "object",
        "properties": {
            "category": {
                "type": "string",
                "enum": ["financial", "identity", "legal", "employment", "medical", "general"],
            },
            "doc_type": {
                "type": "string",
                "enum": [
                    "invoice",
                    "receipt",
                    "passport",
                    "national_id",
                    "driving_licence",
                    "bank_statement",
                    "resume",
                    "document",
                ],
            },
            "country_code": {
                "type": ["string", "null"],
                "description": "ISO 3166-1 alpha-2 or alpha-3 country code if identifiable, or null",
            },
            "confidence": {
                "type": "number",
                "description": "Confidence score between 0.0 and 1.0",
            },
        },
        "required": ["category", "doc_type", "country_code", "confidence"],
        "additionalProperties": False,
    }

    return {
        "type": "json_schema",
        "json_schema": {
            "name": "document_classification",
            "strict": True,
            "schema": schema,
        },
    }
