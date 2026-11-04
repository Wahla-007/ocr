"""Unit tests for OllamaVisionProvider (Phase 9 Air-Gapped Mode)."""

import json

import httpx
import pytest
import respx

from providers.base import RasterPage
from providers.llm.ollama import OllamaVisionProvider, clean_json_markdown


def test_clean_json_markdown():
    # 1. Plain JSON string
    raw = '{"doc_type": "invoice"}'
    assert clean_json_markdown(raw) == raw

    # 2. Markdown fenced with ```json
    fenced = '```json\n{"doc_type": "passport", "confidence": 0.99}\n```'
    assert clean_json_markdown(fenced) == '{"doc_type": "passport", "confidence": 0.99}'

    # 3. Fenced without language tag
    fenced_no_lang = '```\n{"doc_type": "receipt"}\n```'
    assert clean_json_markdown(fenced_no_lang) == '{"doc_type": "receipt"}'


@pytest.mark.asyncio
@respx.mock
async def test_ollama_extract_success():
    client = httpx.AsyncClient()
    provider = OllamaVisionProvider(
        base_url="http://mock-ollama:11434/v1",
        api_key="ollama",
        default_model="qwen2.5vl",
        http_client=client,
    )

    mock_resp = {
        "id": "chatcmpl-mock-ollama-1",
        "object": "chat.completion",
        "created": 1700000000,
        "model": "qwen2.5vl",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": json.dumps(
                        {
                            "fields": {
                                "invoice_number": "INV-2026-001",
                                "total_amount": "500.00",
                                "currency": "USD",
                            },
                            "boxes": [
                                {
                                    "field": "invoice_number",
                                    "box_2d": [100, 200, 130, 400],
                                    "page": 1,
                                }
                            ],
                        }
                    ),
                },
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": 850,
            "completion_tokens": 90,
            "total_tokens": 940,
        },
    }

    respx.post("http://mock-ollama:11434/v1/chat/completions").mock(
        return_value=httpx.Response(200, json=mock_resp)
    )

    fake_page = RasterPage(
        page_number=1,
        width_px=800,
        height_px=1000,
        image_bytes=b"\xff\xd8\xff\xe0fake_jpeg",
        mime_type="image/jpeg",
    )

    res = await provider.extract(
        pages=[fake_page],
        doc_type="invoice",
        model="qwen2.5vl",
        with_boxes=True,
    )

    assert res.model == "qwen2.5vl"
    assert res.extracted_data["fields"]["invoice_number"] == "INV-2026-001"
    assert res.extracted_data["fields"]["total_amount"] == "500.00"
    assert len(res.extracted_data["boxes"]) == 1
    assert res.prompt_tokens == 850
    assert res.completion_tokens == 90
    await client.aclose()


@pytest.mark.asyncio
@respx.mock
async def test_ollama_json_repair_retry():
    client = httpx.AsyncClient()
    provider = OllamaVisionProvider(
        base_url="http://mock-ollama:11434/v1",
        default_model="qwen2.5vl",
        http_client=client,
    )

    # 1. First response returns malformed JSON with trailing junk
    bad_resp = {
        "id": "chatcmpl-bad",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": 'Here is the data: {"fields": {"inv": 123}, unclosed string',
                },
            }
        ],
        "usage": {"prompt_tokens": 100, "completion_tokens": 20},
    }

    # 2. Repair call returns valid JSON
    repaired_resp = {
        "id": "chatcmpl-repair",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": '{"fields": {"inv": 123}, "boxes": []}',
                },
            }
        ],
        "usage": {"prompt_tokens": 50, "completion_tokens": 15},
    }

    route = respx.post("http://mock-ollama:11434/v1/chat/completions")
    route.side_effect = [
        httpx.Response(200, json=bad_resp),
        httpx.Response(200, json=repaired_resp),
    ]

    fake_page = RasterPage(
        page_number=1,
        width_px=800,
        height_px=1000,
        image_bytes=b"\xff\xd8\xff\xe0fake_jpeg",
        mime_type="image/jpeg",
    )

    res = await provider.extract(
        pages=[fake_page],
        doc_type="invoice",
        model="qwen2.5vl",
    )

    assert route.call_count == 2
    assert res.extracted_data["fields"]["inv"] == 123
    assert res.prompt_tokens == 150
    await client.aclose()
