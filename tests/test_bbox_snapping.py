"""Unit tests for Stage 4 bounding box mapping and text-layer snapping."""

from providers.base import RasterPage, TextLayer, WordRect
from worker.pipeline.bbox import (
    convert_box_2d_to_canvas,
    enrich_fields_with_boxes,
    snap_box_to_text_layer,
)


def test_convert_box_2d_to_canvas():
    """Verify coordinate conversion from normalized 0-1000 to pixel canvas."""
    # 0-1000 [ymin, xmin, ymax, xmax] -> page width 1000, height 2000
    box_2d = [100, 200, 300, 600]
    canvas = convert_box_2d_to_canvas(box_2d, width_px=1000, height_px=2000)

    assert canvas is not None
    assert canvas["x"] == 200.0
    assert canvas["y"] == 200.0
    assert canvas["width"] == 400.0
    assert canvas["height"] == 400.0


def test_convert_box_clamping_and_degenerate():
    """Verify out-of-bound clamping and degenerate box discard."""
    # Out of bounds clamped: [-50, -20, 1100, 1050] -> [0, 0, 1000, 1000]
    canvas = convert_box_2d_to_canvas([-50, -20, 1100, 1050], 500, 500)
    assert canvas is not None
    assert canvas["x"] == 0.0
    assert canvas["y"] == 0.0
    assert canvas["width"] == 500.0
    assert canvas["height"] == 500.0

    # Degenerate: ymax <= ymin -> None
    assert convert_box_2d_to_canvas([300, 100, 200, 400], 500, 500) is None
    # Degenerate: xmax <= xmin -> None
    assert convert_box_2d_to_canvas([100, 400, 200, 300], 500, 500) is None


def test_text_layer_snapping_exact_match():
    """Verify snapping to digital text layer word rect replaces box and tags box_source='text_layer'."""
    text_layer = TextLayer(
        words=[
            WordRect(text="Invoice", x0=100.0, y0=50.0, x1=160.0, y1=70.0),
            WordRect(text="INV-2026-0042", x0=170.0, y0=50.0, x1=280.0, y1=70.0),
        ]
    )

    # Imprecise model estimation box
    model_box = {"x": 165.0, "y": 48.0, "width": 120.0, "height": 25.0}
    snapped, source = snap_box_to_text_layer(
        model_box,
        value="INV-2026-0042",
        text_layer=text_layer,
    )

    assert source == "text_layer"
    assert snapped["x"] == 170.0
    assert snapped["y"] == 50.0
    assert snapped["width"] == 110.0
    assert snapped["height"] == 20.0


def test_text_layer_snapping_fallback_to_model():
    """Verify fallback to model box when text layer has no matching tokens nearby."""
    text_layer = TextLayer(
        words=[
            WordRect(text="Total", x0=500.0, y0=800.0, x1=550.0, y1=820.0),
        ]
    )

    model_box = {"x": 100.0, "y": 200.0, "width": 80.0, "height": 30.0}
    snapped, source = snap_box_to_text_layer(
        model_box,
        value="UNMATCHED_VALUE",
        text_layer=text_layer,
    )

    assert source == "model"
    assert snapped == model_box


def test_enrich_fields_with_boxes_graceful():
    """Verify field enrichment with mixed boxes and missing boxes without raising exceptions."""
    fields = {
        "invoice_number": "INV-101",
        "total_amount": 99.99,
        "notes": None,  # Null fields dropped
    }
    raw_boxes = [
        {
            "field": "invoice_number",
            "page": 1,
            "box_2d": [100, 100, 150, 300],
        }
    ]
    page = RasterPage(
        page_number=1,
        width_px=1000,
        height_px=1000,
        image_bytes=b"fake",
    )

    enriched = enrich_fields_with_boxes(fields, raw_boxes, pages=[page])

    assert len(enriched) == 2  # invoice_number and total_amount
    inv_field = next(f for f in enriched if f["key"] == "invoice_number")
    assert inv_field["bbox"] is not None
    assert inv_field["box_source"] == "model"

    total_field = next(f for f in enriched if f["key"] == "total_amount")
    assert total_field["bbox"] is None  # Missing box does not fail
    assert total_field["box_source"] is None
