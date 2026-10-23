import os
import base64
import json
import httpx
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

API_KEY = os.environ.get("GEMINI_API_KEY", "")
MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

def extract_with_gemini_vision(image_path: Path) -> dict:
    with open(image_path, "rb") as f:
        img_bytes = f.read()
    b64 = base64.b64encode(img_bytes).decode("utf-8")
    
    prompt = """You are an expert commercial invoice document intelligence extractor.
Analyze this invoice image and extract structured fields with extreme precision according to this schema.

Required JSON structure:
{
  "supplier": "string (company/person issuing the invoice)",
  "address": "string (supplier address)",
  "customer": "string or null (client/billed-to party if present)",
  "invoice_number": "string",
  "po_number": "string or null (purchase order / bon de commande)",
  "invoice_date": "YYYY-MM-DD",
  "invoice_due_date": "YYYY-MM-DD or null (date d'échéance)",
  "currency": "string (e.g. EUR, USD)",
  "total_untaxed": float (subtotal / montant HT),
  "tax_amount": float (total tax / TVA),
  "total_amount": float (grand total / montant TTC),
  "lines": [
    {
      "description": "string",
      "quantity": float,
      "uom": "string or null (unit of measure, e.g. Heures, Unités)",
      "price": float (unit price),
      "tax": "string or null (e.g. TVA 20%)",
      "sub_total": float (line total)
    }
  ]
}

Format strictly as JSON. Do not include markdown codeblocks or extra text."""

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": "image/jpeg", "data": b64}}
            ]
        }],
        "generationConfig": {
            "temperature": 0.0,
            "responseMimeType": "application/json"
        }
    }
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"
    with httpx.Client(timeout=60.0) as client:
        resp = client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(raw_text)

if __name__ == "__main__":
    test_img = Path("d:/invoice_dataset/invoice_dataset_model_1/images/FACTU2015020048.jpg")
    res = extract_with_gemini_vision(test_img)
    print("Gemini Vision Result for FACTU2015020048.jpg:")
    print(json.dumps(res, indent=2, ensure_ascii=False))
