"""Bounding Box Normalization, Coordinate Conversion, and Text-Layer Snapping (Stage 4).

Converts model-predicted `box_2d` [ymin, xmin, ymax, xmax] (normalized 0-1000)
to canvas pixel coordinates `{x, y, width, height}`.
For digital PDFs, snaps the model box to exact digital word rectangles from `TextLayer`.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Sequence
from providers.base import RasterPage, TextLayer, WordRect

logger = logging.getLogger(__name__)


def convert_box_2d_to_canvas(
    box_2d: Sequence[int] | None,
    width_px: int,
    height_px: int,
) -> dict[str, float] | None:
    """Converts normalized 0-1000 [ymin, xmin, ymax, xmax] coordinates to canvas pixel rect."""
    if not box_2d or len(box_2d) != 4:
        return None

    try:
        ymin, xmin, ymax, xmax = [float(v) for v in box_2d]

        # Clamp to [0, 1000]
        xmin = max(0.0, min(1000.0, xmin))
        xmax = max(0.0, min(1000.0, xmax))
        ymin = max(0.0, min(1000.0, ymin))
        ymax = max(0.0, min(1000.0, ymax))

        if xmax <= xmin or ymax <= ymin:
            return None  # Discard degenerate box

        canvas_x = round((xmin / 1000.0) * width_px, 1)
        canvas_y = round((ymin / 1000.0) * height_px, 1)
        canvas_w = round(((xmax - xmin) / 1000.0) * width_px, 1)
        canvas_h = round(((ymax - ymin) / 1000.0) * height_px, 1)

        if canvas_w <= 0.0 or canvas_h <= 0.0:
            return None

        return {
            "x": canvas_x,
            "y": canvas_y,
            "width": canvas_w,
            "height": canvas_h,
        }
    except Exception as exc:
        logger.debug(f"Failed to convert box_2d {box_2d}: {exc}")
        return None


def _clean_token(text: str) -> str:
    """Removes punctuation and normalizes to lowercase alphanumeric."""
    return re.sub(r"[^\w]", "", text).lower()


def snap_box_to_text_layer(
    model_box: dict[str, float],
    value: Any,
    text_layer: TextLayer | None,
    proximity_margin_px: float = 60.0,
) -> tuple[dict[str, float], str]:
    """Snaps a model estimated box to exact digital word rectangles from TextLayer if available.

    Returns: (final_box, box_source) where box_source is 'text_layer' or 'model'.
    """
    if not text_layer or not text_layer.words or value is None:
        return model_box, "model"

    val_str = str(value).strip()
    val_clean = _clean_token(val_str)
    if not val_clean:
        return model_box, "model"

    bx0 = model_box["x"] - proximity_margin_px
    by0 = model_box["y"] - proximity_margin_px
    bx1 = model_box["x"] + model_box["width"] + proximity_margin_px
    by1 = model_box["y"] + model_box["height"] + proximity_margin_px

    # Filter candidate words physically in or near the model box
    nearby_words: list[WordRect] = []
    for w in text_layer.words:
        if (w.x1 >= bx0 and w.x0 <= bx1) and (w.y1 >= by0 and w.y0 <= by1):
            nearby_words.append(w)

    if not nearby_words:
        return model_box, "model"

    # Search for matching word or sequence of words
    matched_words: list[WordRect] = []

    # 1. Exact single word match
    for w in nearby_words:
        if _clean_token(w.text) == val_clean:
            matched_words = [w]
            break

    # 2. Substring match across sequence of words
    if not matched_words:
        combined_text = ""
        candidate_sublist: list[WordRect] = []
        for w in nearby_words:
            w_clean = _clean_token(w.text)
            if not w_clean:
                continue
            combined_text += w_clean
            candidate_sublist.append(w)
            if val_clean in combined_text:
                matched_words = candidate_sublist
                break

    # If match found, compute bounding box union
    if matched_words:
        min_x = min(w.x0 for w in matched_words)
        min_y = min(w.y0 for w in matched_words)
        max_x = max(w.x1 for w in matched_words)
        max_y = max(w.y1 for w in matched_words)

        snapped_box = {
            "x": round(min_x, 1),
            "y": round(min_y, 1),
            "width": round(max(1.0, max_x - min_x), 1),
            "height": round(max(1.0, max_y - min_y), 1),
        }
        return snapped_box, "text_layer"

    return model_box, "model"


EMPTY_FIELD_INDICATORS = {
    "", "null", "none", "n/a", "na", "not applicable", 
    "not specified", "unspecified", "unknown", "nil", "-", "--", "undefined"
}


def is_empty_field_value(val: Any) -> bool:
    """Returns True if a field value represents absent, null, empty, or placeholder data."""
    if val is None:
        return True
    if isinstance(val, str):
        cleaned = val.strip().lower()
        if not cleaned or cleaned in EMPTY_FIELD_INDICATORS:
            return True
    if isinstance(val, (list, dict)) and len(val) == 0:
        return True
    return False


def enrich_fields_with_boxes(
    fields: dict[str, Any],
    raw_boxes: list[dict[str, Any]],
    pages: Sequence[RasterPage],
) -> list[dict[str, Any]]:
    """Enriches raw extracted key-value fields with canvas bounding boxes and box_source tags.
    Strictly omits empty, null, placeholder, or absent fields so the user only sees
    actual data present in the document.
    """
    # Index pages by page_number
    page_map = {p.page_number: p for p in pages}

    # Index model boxes by field name
    box_map: dict[str, dict[str, Any]] = {}
    for b in raw_boxes:
        if isinstance(b, dict) and "field" in b:
            box_map[b["field"]] = b

    enriched_fields: list[dict[str, Any]] = []

    for key, val in fields.items():
        if is_empty_field_value(val):
            continue

        # 1. Unpack additional_fields dynamically into first-class fields
        if key == "additional_fields" and isinstance(val, list):
            for idx, item in enumerate(val):
                if isinstance(item, dict):
                    item_key = str(item.get("key", f"extra_{idx + 1}")).strip()
                    item_val = item.get("value")
                    if not is_empty_field_value(item_val) and not is_empty_field_value(item_key):
                        add_box_meta = box_map.get(item_key)
                        add_canvas_box = None
                        add_box_source = None
                        add_page_num = 1
                        if add_box_meta:
                            add_page_num = int(add_box_meta.get("page", 1))
                            p_obj = page_map.get(add_page_num, pages[0] if pages else None)
                            if p_obj:
                                add_canvas_box = convert_box_2d_to_canvas(
                                    add_box_meta.get("box_2d"),
                                    p_obj.width_px,
                                    p_obj.height_px,
                                )
                                if add_canvas_box:
                                    add_canvas_box, add_box_source = snap_box_to_text_layer(
                                        add_canvas_box,
                                        item_val,
                                        p_obj.text_layer,
                                    )
                        item_label = item_key.replace("_", " ").title()
                        enriched_fields.append({
                            "key": item_key,
                            "label": item_label,
                            "value": item_val,
                            "confidence": 0.98,
                            "page": add_page_num,
                            "bbox": add_canvas_box,
                            "box_source": add_box_source,
                        })
            continue

        # 2. Unpack individual line_items
        if key == "line_items" and isinstance(val, list):
            for idx, item in enumerate(val):
                if isinstance(item, dict):
                    desc = str(item.get("description", f"Item {idx + 1}")).strip()
                    amt = item.get("amount") or item.get("total") or item.get("unit_price")
                    qty = item.get("quantity")
                    if not is_empty_field_value(desc) or not is_empty_field_value(amt):
                        line_summary = f"{desc} (Qty: {qty}, Amount: {amt})" if qty else f"{desc} ({amt})"
                        enriched_fields.append({
                            "key": f"line_item_{idx + 1}",
                            "label": f"Line Item {idx + 1}",
                            "value": line_summary,
                            "confidence": 0.98,
                            "page": 1,
                            "bbox": None,
                            "box_source": None,
                        })
            continue

        # 3. Unpack work history (Resumes)
        if key == "work_history" and isinstance(val, list):
            for idx, item in enumerate(val):
                if isinstance(item, dict):
                    title = item.get("job_title") or ""
                    comp = item.get("company") or ""
                    dates = f" ({item.get('start_date')} - {item.get('end_date')})" if item.get('start_date') else ""
                    if title or comp:
                        enriched_fields.append({
                            "key": f"experience_{idx + 1}",
                            "label": f"Experience {idx + 1}",
                            "value": f"{title} at {comp}{dates}".strip(),
                            "confidence": 0.98,
                            "page": 1,
                            "bbox": None,
                            "box_source": None,
                        })
            continue

        # 4. Unpack education (Resumes)
        if key == "education" and isinstance(val, list):
            for idx, item in enumerate(val):
                if isinstance(item, dict):
                    deg = item.get("degree") or ""
                    inst = item.get("institution") or ""
                    year = f" ({item.get('graduation_year')})" if item.get('graduation_year') else ""
                    if deg or inst:
                        enriched_fields.append({
                            "key": f"education_{idx + 1}",
                            "label": f"Education {idx + 1}",
                            "value": f"{deg}, {inst}{year}".strip(),
                            "confidence": 0.98,
                            "page": 1,
                            "bbox": None,
                            "box_source": None,
                        })
            continue

        # 5. Format string lists (skills, languages, certifications)
        if key in ("skills", "languages", "certifications") and isinstance(val, list):
            cleaned_list = [str(s).strip() for s in val if not is_empty_field_value(s)]
            if cleaned_list:
                enriched_fields.append({
                    "key": key,
                    "label": key.replace("_", " ").title(),
                    "value": ", ".join(cleaned_list),
                    "confidence": 0.98,
                    "page": 1,
                    "bbox": None,
                    "box_source": None,
                })
            continue

        # 6. Format nested dicts to human-readable strings
        if isinstance(val, dict):
            dict_vals = [str(v).strip() for v in val.values() if not is_empty_field_value(v)]
            if not dict_vals:
                continue
            val_display = ", ".join(dict_vals)
        else:
            val_display = val

        # Final check on display value
        if is_empty_field_value(val_display):
            continue

        # Look up bounding box
        box_meta = box_map.get(key)
        page_num = 1
        canvas_box: dict[str, float] | None = None
        box_source: str | None = None

        if box_meta:
            page_num = int(box_meta.get("page", 1))
            page_obj = page_map.get(page_num, pages[0] if pages else None)

            if page_obj:
                raw_box_2d = box_meta.get("box_2d")
                canvas_box = convert_box_2d_to_canvas(
                    raw_box_2d,
                    page_obj.width_px,
                    page_obj.height_px,
                )

                if canvas_box:
                    # Apply text layer snapping if digital text layer exists
                    canvas_box, box_source = snap_box_to_text_layer(
                        canvas_box,
                        val_display,
                        page_obj.text_layer,
                    )

        label = key.replace("_", " ").title()
        enriched_fields.append({
            "key": key,
            "label": label,
            "value": val_display,
            "confidence": 0.98,
            "page": page_num,
            "bbox": canvas_box,
            "box_source": box_source,
        })

    return enriched_fields
