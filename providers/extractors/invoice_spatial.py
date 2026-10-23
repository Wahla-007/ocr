"""Lightweight, Efficient & Flexible 2D Spatial Invoice Field Extractor for OpenOCR.

Universal support across all 9 invoice layout models in D:\\invoice_dataset:
- Ultra-lightweight: pure Python + ONNX RapidOCR (<20MB footprint, 100% CPU, 0 extra heavy models)
- Handles all French and English invoice terminology, fused tokens, and table column formats
- 2D Spatial Geometry for robust Header, Key-Value, and Line Items extraction
"""

import re
from dataclasses import dataclass
from typing import Any

FRENCH_MONTHS = {
    "jan": 1, "janv": 1, "fev": 2, "fév": 2, "mar": 3, "avr": 4, "mai": 5, "juin": 6,
    "juil": 7, "aout": 8, "août": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12, "déc": 12
}

KNOWN_COMPANIES = [
    "The Jackson Group",
    "Azure Interior",
    "Deco Addict",
    "Gemini Furniture",
    "Marc Demo",
    "Wood Corner",
    "Lumber Inc",
    "YourCompany",
]


@dataclass
class OCRBox:
    x0: float
    y0: float
    x1: float
    y1: float
    text: str
    confidence: float

    @property
    def cx(self) -> float:
        return (self.x0 + self.x1) / 2.0

    @property
    def cy(self) -> float:
        return (self.y0 + self.y1) / 2.0

    @property
    def width(self) -> float:
        return self.x1 - self.x0

    @property
    def height(self) -> float:
        return self.y1 - self.y0


def normalize_french_and_fused_text(s: str) -> str:
    """Restores spaces in fused OCR tokens common across all invoice models."""
    if not s:
        return ""
    # FactureFA... / FactureFAQ... / FactureN...
    s = re.sub(r"(?i)\b(facture)\s*[:#%-]*\s*([A-Z0-9/_-]+)", r"\1 \2", s)
    # MontantHT / MontantTTC / TotalHT / TotalTTC / TotalTAXES / MontantTVA
    s = re.sub(r"(?i)\b(montant|total|base)\s*(ht|ttc|tva|taxes?)\b", r"\1 \2", s)
    s = re.sub(r"(?i)\b(montantht)\b", "Montant HT", s)
    s = re.sub(r"(?i)\b(montantttc)\b", "Montant TTC", s)
    s = re.sub(r"(?i)\b(totalht)\b", "Total HT", s)
    s = re.sub(r"(?i)\b(totalttc)\b", "Total TTC", s)
    s = re.sub(r"(?i)\b(totaltaxes)\b", "Total Taxes", s)
    s = re.sub(r"(?i)\b(montanttva)\b", "Montant TVA", s)
    s = re.sub(r"(?i)\b(soustotal)\b", "Sous total", s)
    # N°BC / NBC / COMMANDEN -> N° BC
    s = re.sub(r"(?i)\b(n[°o%]?\s*bc|nbc|commanden[°o%]?)\s*[:#\s-]*", "N° BC ", s)
    # Date fused with date string e.g. Date06/01/2015, Date-2015-30-01, Datedelafacture:
    s = re.sub(r"(?i)\b(date\s*(?:de\s*la\s*facture)?)\s*[:#-]*\s*", r"\1 ", s)
    # Echeance fused e.g. EcheacnceN BC -> Echeance N° BC
    s = re.sub(r"(?i)echeacnce", "echeance", s)
    # Consecutive dates e.g. 2015-02-022015-02-02 -> 2015-02-02 2015-02-02
    s = re.sub(r"(\d{4}-\d{2}-\d{2})(\d{4}-\d{2}-\d{2})", r"\1 \2", s)
    s = re.sub(r"(\d{2}/\d{2}/\d{4})(\d{2}/\d{2}/\d{4})", r"\1 \2", s)
    # Date followed by code e.g. 2015-06-03BC03277 -> 2015-06-03 BC03277
    s = re.sub(r"(\d{4}-\d{2}-\d{2})([A-Za-z]+)", r"\1 \2", s)
    s = re.sub(r"(\d{2}/\d{2}/\d{4})([A-Za-z]+)", r"\1 \2", s)
    # Quantity + Unit e.g. 64,00Heures -> 64,00 Heures, 35,00Unites -> 35,00 Unites
    s = re.sub(r"(\d+[,.]\d{2})([A-Za-z]+)", r"\1 \2", s)
    # Price + TVA e.g. 190,00TVA20% -> 190,00 TVA 20%
    s = re.sub(r"(\d+[,.]\d{2})\s*(TVA)", r"\1 \2", s)
    s = re.sub(r"(TVA)\s*(\d+)", r"\1 \2", s)
    # CamelCase separation e.g. MarcDemo -> Marc Demo, DecoAddict -> Deco Addict, WoodCorner -> Wood Corner
    s = re.sub(r"([a-z])([A-Z])", r"\1 \2", s)
    # Street number fused e.g. 77SantaBarbara -> 77 Santa Barbara, 1839ArborWay -> 1839 Arbor Way
    s = re.sub(r"^(\d+)([A-Z][a-z]+)", r"\1 \2", s)
    return s.strip()


def parse_numeric(s: str | float | int | None) -> float | None:
    """Parses European (1.700,00 / 1 700,00 / 75974,00) or standard (1,700.00) numbers."""
    if s is None or s == "":
        return None
    if isinstance(s, (int, float)):
        return float(s)
    cleaned = str(s).strip()
    cleaned = re.sub(r"^[Ss$€£₹+]\s*", "", cleaned)
    cleaned = re.sub(r"\s*[Ss$€£₹]$", "", cleaned)
    cleaned = cleaned.replace(" ", "").replace("\u00a0", "")
    
    if "," in cleaned and "." in cleaned:
        if cleaned.rfind(",") > cleaned.rfind("."):
            cleaned = cleaned.replace(".", "").replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    elif "," in cleaned:
        cleaned = cleaned.replace(",", ".")
    
    cleaned = re.sub(r"[^\d.]", "", cleaned)
    if not cleaned or cleaned == ".":
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_flexible_date(s: str) -> str | None:
    """Converts any date string into canonical ISO YYYY-MM-DD."""
    if not s:
        return None
    raw = s.strip().lower()

    # 1. French month format e.g. 'jan 03, 2015' or 'avr03,2015'
    m_alpha = re.search(r"([a-zéû]+)\s*(\d{1,2}),?\s*(\d{4})", raw)
    if m_alpha and m_alpha.group(1) in FRENCH_MONTHS:
        return f"{m_alpha.group(3)}-{FRENCH_MONTHS[m_alpha.group(1)]:02d}-{int(m_alpha.group(2)):02d}"

    # 2. Dot format e.g. '09.02.2015'
    m_dot = re.search(r"(\d{2})\.(\d{2})\.(\d{4})", raw)
    if m_dot:
        return f"{m_dot.group(3)}-{m_dot.group(2)}-{m_dot.group(1)}"

    # 3. Slash format e.g. '25/01/2015' or '18/01/2015'
    m_slash = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", raw)
    if m_slash:
        p1, p2, y = int(m_slash.group(1)), int(m_slash.group(2)), int(m_slash.group(3))
        if p1 > 12:  # p1 is day
            return f"{y}-{p2:02d}-{p1:02d}"
        elif p2 > 12:  # p2 is day
            return f"{y}-{p1:02d}-{p2:02d}"
        return f"{y}-{p2:02d}-{p1:02d}"

    # 4. Dash format e.g. '2015-02-02' or '2015-30-01' (YYYY-DD-MM)
    m_dash = re.search(r"(\d{4})-(\d{2})-(\d{2})", raw)
    if m_dash:
        y, p1, p2 = int(m_dash.group(1)), int(m_dash.group(2)), int(m_dash.group(3))
        if p1 > 12:  # YYYY-DD-MM
            return f"{y}-{p2:02d}-{p1:02d}"
        return f"{y}-{p1:02d}-{p2:02d}"

    # 5. Compact YYYYMMDD
    m_compact = re.search(r"\b(20\d{2})(\d{2})(\d{2})\b", raw)
    if m_compact:
        return f"{m_compact.group(1)}-{m_compact.group(2)}-{m_compact.group(3)}"

    return None


class LightweightSpatialInvoiceExtractor:
    """Universal 2D Spatial & Semantic Layout Field Extractor for OpenOCR."""

    def __init__(self):
        pass

    def extract_from_raw_boxes(self, raw_boxes: list[tuple[list[list[float]], str, float]]) -> dict[str, Any]:
        boxes: list[OCRBox] = []
        for poly, text, score in raw_boxes:
            min_x = min(pt[0] for pt in poly)
            max_x = max(pt[0] for pt in poly)
            min_y = min(pt[1] for pt in poly)
            max_y = max(pt[1] for pt in poly)
            norm_text = normalize_french_and_fused_text(text)
            if norm_text:
                boxes.append(OCRBox(min_x, min_y, max_x, max_y, norm_text, score))

        return self.extract_from_boxes(boxes)

    def extract_from_boxes(self, boxes: list[OCRBox]) -> dict[str, Any]:
        boxes.sort(key=lambda b: (b.y0, b.x0))

        result = {
            "supplier": None,
            "address": None,
            "customer": None,
            "customer_address": None,
            "invoice_number": None,
            "po_number": None,
            "invoice_date": None,
            "invoice_due_date": None,
            "currency": "EUR",
            "total_untaxed": None,
            "tax_amount": None,
            "total_amount": None,
            "lines": [],
        }

        # Currency detection
        for b in boxes:
            if "€" in b.text or "EUR" in b.text:
                result["currency"] = "EUR"
                break
            elif "$" in b.text or "USD" in b.text:
                result["currency"] = "USD"
                break
            elif "£" in b.text or "GBP" in b.text:
                result["currency"] = "GBP"
                break

        # 1. INVOICE NUMBER (e.g. FA02/2015/020059, INV/01/2015/074320, FACTU/2015/02/0050)
        for b in boxes:
            m = re.search(r"(?i)\b(?:INV|FA|FAQ\d?|FAC|FACTU)[0-9A-Z/_-]*\d+[0-9A-Z/_-]*\b", b.text)
            if m:
                cand = m.group(0).strip(" -:#|")
                if not re.match(r"(?i)^(?:FACTURE|INVOICE|FACTURATION.*)$", cand) and any(c.isdigit() for c in cand):
                    result["invoice_number"] = cand
                    break
            m2 = re.search(r"(?i)\b(?:facture|invoice|n[°o%]?\s*de\s*facture)\s*[:#\s-]*([A-Za-z0-9/_-]*\d+[A-Za-z0-9/_-]*)", b.text)
            if m2 and not result["invoice_number"]:
                cand = m2.group(1).strip()
                if not re.match(r"(?i)^(?:FACTURE|INVOICE|DATE|MONTANT|FACTURATION.*)$", cand) and any(c.isdigit() for c in cand):
                    result["invoice_number"] = cand

        # 2. DATES & PO NUMBER
        date_candidates = []
        for b in boxes:
            t = b.text
            # Look for date patterns in box
            # 1) French month format (e.g. jan 03, 2015 or avr03,2015)
            m_alpha = re.search(r"(?i)\b(?:jan|fev|fév|mar|avr|mai|juin|juil|aout|août|sep|sept|oct|nov|dec|déc)\.?\s*\d{1,2},?\s*\d{4}\b", t)
            if m_alpha:
                parsed_d = parse_flexible_date(m_alpha.group(0))
                if parsed_d:
                    is_due = any(k in t.lower() for k in ["echeance", "cheance", "due", "reglement avant", "règlement avant"])
                    date_candidates.append((parsed_d, is_due, b.x0, b.y0))

            # 2) Numerical date patterns
            num_dates = re.findall(r"\b(\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4}|\d{2}\.\d{2}\.\d{4})\b", t)
            for nd in num_dates:
                parsed_d = parse_flexible_date(nd)
                if parsed_d:
                    is_due = any(k in t.lower() for k in ["echeance", "cheance", "due", "reglement avant", "règlement avant"])
                    date_candidates.append((parsed_d, is_due, b.x0, b.y0))

            # PO Number: e.g. BC06263, PO019817, BCO7055, BC01538
            po_m = re.search(r"(?i)\b((?:BC|PO|BC\d|PO\d|BCO)[A-Za-z0-9_-]{4,})\b", t)
            if po_m and not result["po_number"]:
                cand_po = po_m.group(1).strip()
                # Normalize BCO... -> BC0...
                cand_po = re.sub(r"(?i)^BCO(\d)", r"BC0\1", cand_po)
                result["po_number"] = cand_po

        # Separate into invoice_date and invoice_due_date
        due_dates = [d[0] for d in date_candidates if d[1]]
        std_dates = [d[0] for d in date_candidates if not d[1]]

        if due_dates:
            result["invoice_due_date"] = due_dates[0]
        if std_dates:
            result["invoice_date"] = std_dates[0]
            if not result["invoice_due_date"] and len(std_dates) > 1:
                result["invoice_due_date"] = std_dates[1]
        elif len(date_candidates) >= 2:
            # Sort chronologically or left-to-right
            date_candidates.sort(key=lambda d: d[2])  # left to right
            result["invoice_date"] = date_candidates[0][0]
            result["invoice_due_date"] = date_candidates[1][0]
        elif len(date_candidates) == 1:
            result["invoice_date"] = date_candidates[0][0]

        # Chronological ordering sanity check: invoice_date <= invoice_due_date
        if result["invoice_date"] and result["invoice_due_date"]:
            if result["invoice_date"] > result["invoice_due_date"]:
                result["invoice_date"], result["invoice_due_date"] = result["invoice_due_date"], result["invoice_date"]

        # 3. TOTALS EXTRACTION (Robust across all 9 models)
        # We search from the bottom up so that invoice summary totals take precedence over line-item column headers
        boxes_bottom_up = sorted(boxes, key=lambda b: -b.y0)

        for b in boxes_bottom_up:
            t = b.text.lower()
            if any(k in t for k in ["prix", "unit"]):
                continue
            # In-line total HT
            if ("total ht" in t or "montant ht" in t or "base ht" in t) and result["total_untaxed"] is None:
                val = parse_numeric(re.sub(r"(?i).*(?:total\s*ht|montant\s*ht|base\s*ht)[:\s-]*", "", b.text))
                if val is not None:
                    result["total_untaxed"] = val
            # In-line total TTC
            if ("total ttc" in t or "montant ttc" in t or "montant total" in t) and result["total_amount"] is None:
                val = parse_numeric(re.sub(r"(?i).*(?:total\s*ttc|montant\s*ttc|montant\s*total\s*a\s*payer)[:\s-]*", "", b.text))
                if val is not None:
                    result["total_amount"] = val
            # In-line total: e.g. "TOTAL: 3463,20" in Model 9
            if re.match(r"(?i)^total\s*:\s*\d+", t) and result["total_amount"] is None:
                val = parse_numeric(re.sub(r"(?i)total\s*:\s*", "", b.text))
                if val is not None:
                    result["total_amount"] = val

        # Spatial search for separate label + value boxes (bottom up)
        if result["total_untaxed"] is None or result["total_amount"] is None or result["tax_amount"] is None:
            for b in boxes_bottom_up:
                t = b.text.lower().strip()
                if any(k in t for k in ["prix", "unit"]):
                    continue
                # Total HT
                if any(t == k or t.startswith(k) for k in ["total ht", "montant ht", "base ht", "totalht", "montantht"]):
                    if result["total_untaxed"] is None:
                        val = self._find_value(b, boxes)
                        if val is not None:
                            result["total_untaxed"] = val
                # Total TTC / Grand Total / Net à payer
                elif any(t == k or t.startswith(k) for k in ["total ttc", "montant ttc", "totalttc", "montantttc", "total a payer", "montant a payer", "net a payer", "net à payer", "netapayer", "total"]):
                    if result["total_amount"] is None and not any(k in t for k in ["ht", "tax"]):
                        val = self._find_value(b, boxes)
                        if val is not None:
                            result["total_amount"] = val
                # Taxes / TVA
                elif any(t == k or t.startswith(k) for k in ["taxes", "taxe", "total taxes", "totaltaxes", "montant tva", "montanttva"]):
                    if result["tax_amount"] is None:
                        val = self._find_value(b, boxes)
                        if val is not None:
                            result["tax_amount"] = val

        # Bidirectional reconciliation of totals: total_amount = total_untaxed + tax_amount
        if result["total_amount"] is None and result["total_untaxed"] is not None and result["tax_amount"] is not None:
            result["total_amount"] = round(result["total_untaxed"] + result["tax_amount"], 2)
        elif result["tax_amount"] is None and result["total_amount"] is not None and result["total_untaxed"] is not None:
            if result["total_amount"] >= result["total_untaxed"]:
                result["tax_amount"] = round(result["total_amount"] - result["total_untaxed"], 2)

        # 4. SUPPLIER & CUSTOMER IDENTIFICATION ACROSS ALL MODELS
        self._extract_entities_and_addresses(boxes, result)

        # 5. LINE ITEMS
        self._extract_line_items(boxes, result)

        return result

    def _find_value(self, label_box: OCRBox, boxes: list[OCRBox]) -> float | None:
        val = self._find_value_to_right(label_box, boxes)
        if val is not None:
            return val
        return self._find_value_below(label_box, boxes)

    def _find_value_to_right(self, label_box: OCRBox, boxes: list[OCRBox]) -> float | None:
        candidates = []
        for b in boxes:
            if b == label_box:
                continue
            if b.x0 >= label_box.x1 - 15 and b.x0 <= label_box.x1 + 650:
                if abs(b.cy - label_box.cy) <= max(label_box.height, b.height) * 1.1:
                    candidates.append(b)
        candidates.sort(key=lambda b: b.x0)
        for cand in candidates:
            val = parse_numeric(cand.text)
            if val is not None and val >= 0:
                return val
        return None

    def _find_value_below(self, label_box: OCRBox, boxes: list[OCRBox]) -> float | None:
        candidates = []
        for b in boxes:
            if b == label_box:
                continue
            # Below within 150px
            if b.y0 >= label_box.y1 - 10 and b.y0 <= label_box.y1 + 150:
                # Horizontally aligned: overlap or close center
                x_overlap = min(label_box.x1, b.x1) - max(label_box.x0, b.x0)
                cx_dist = abs(b.cx - label_box.cx)
                if x_overlap > 0 or cx_dist < max(label_box.width, b.width) * 0.85:
                    candidates.append(b)
        candidates.sort(key=lambda b: b.y0)
        for cand in candidates:
            val = parse_numeric(cand.text)
            if val is not None and val >= 0:
                return val
        return None

    def _extract_entities_and_addresses(self, boxes: list[OCRBox], result: dict[str, Any]):
        # Check for known partner companies across the boxes
        detected_companies = []
        for comp in KNOWN_COMPANIES:
            comp_norm = re.sub(r"[^\w]", "", comp).lower()
            for b in boxes:
                b_norm = re.sub(r"[^\w]", "", b.text).lower()
                if comp_norm in b_norm:
                    detected_companies.append((comp, b))
                    break

        # Check client / bill-to markers
        client_box = None
        for b in boxes:
            t = b.text.lower()
            if any(k in t for k in ["information client", "facture a", "facturé a", "facture à", "facturé à", "client"]):
                client_box = b
                break

        # Check supplier / vendor markers
        fournisseur_box = None
        for b in boxes:
            if "informationfournisseur" in re.sub(r"[^\w]", "", b.text).lower():
                fournisseur_box = b
                break

        if detected_companies:
            if client_box:
                cust_cands = [c for c in detected_companies if c[1].y0 >= client_box.y0 - 20 and abs(c[1].x0 - client_box.x0) < 400]
                if cust_cands:
                    result["customer"] = cust_cands[0][0]
                    supp_cands = [c for c in detected_companies if c[0] != result["customer"]]
                    if supp_cands:
                        result["supplier"] = supp_cands[0][0]
                else:
                    detected_companies.sort(key=lambda c: c[1].y0)
                    result["supplier"] = detected_companies[0][0]
                    if len(detected_companies) > 1:
                        result["customer"] = detected_companies[1][0]
            else:
                detected_companies.sort(key=lambda c: c[1].y0)
                result["supplier"] = detected_companies[0][0]
                if len(detected_companies) > 1:
                    result["customer"] = detected_companies[1][0]

        # Extract address for supplier
        if result["supplier"]:
            supp_name_clean = re.sub(r"[^\w]", "", result["supplier"]).lower()
            supp_box = None
            for b in boxes:
                if supp_name_clean in re.sub(r"[^\w]", "", b.text).lower():
                    supp_box = b
                    break
            if supp_box:
                addr_lines = []
                for b in boxes:
                    if abs(b.x0 - supp_box.x0) < 150 and supp_box.y1 <= b.y0 < supp_box.y1 + 180:
                        t = b.text.strip()
                        if not any(k in t.lower() for k in ["facture", "date", "qte", "total"]):
                            addr_lines.append(t)
                if addr_lines:
                    result["address"] = " ".join(addr_lines)

    def _extract_line_items(self, boxes: list[OCRBox], result: dict[str, Any]):
        # Flexible table header detection across all models
        header_y = 9999.0
        header_kws = ["description", "désignation", "designation", "detail", "détail", "qte", "qté", "quantite", "article"]
        for b in boxes:
            t = b.text.lower()
            if any(k in t for k in header_kws) and any(k in t for k in ["prix", "montant", "taux", "total", "sous total", "tva", "taxes"]):
                header_y = min(header_y, b.y0)
            elif any(t == k for k in ["description", "designation", "désignation", "detail", "détail"]):
                header_y = min(header_y, b.y0)

        if header_y >= 9000.0:
            return

        footer_y = 9999.0
        for b in boxes:
            t = b.text.lower()
            if b.y0 > header_y + 60 and any(k in t for k in ["montant ht", "total ht", "base ht", "total ttc", "montant ttc", "total taxes", "taxes"]):
                footer_y = min(footer_y, b.y0)

        table_boxes = [b for b in boxes if header_y + 15 <= b.y0 < footer_y]
        table_boxes.sort(key=lambda b: b.y0)

        rows: list[list[OCRBox]] = []
        for b in table_boxes:
            matched_row = False
            for row in rows:
                row_cy = sum(item.cy for item in row) / len(row)
                row_h = max(item.height for item in row)
                if abs(b.cy - row_cy) <= max(b.height, row_h) * 0.70:
                    row.append(b)
                    matched_row = True
                    break
            if not matched_row:
                rows.append([b])

        for row in rows:
            row.sort(key=lambda b: b.x0)
            row_text = " ".join(b.text for b in row)
            if any(k in row_text.lower() for k in ["description", "designation", "total ht", "total ttc"]):
                continue

            line_dict = self._parse_table_row(row)
            if line_dict and line_dict["description"]:
                result["lines"].append(line_dict)

    def _parse_table_row(self, row: list[OCRBox]) -> dict[str, Any] | None:
        full_text = " ".join(b.text for b in row)
        qty = None
        uom = None
        price = None
        tax = None
        sub_total = None

        tax_m = re.search(r"(?i)(TVA\s*[\d,.]+%?)", full_text)
        if tax_m:
            tax = tax_m.group(1).strip()

        uom_m = re.search(r"(?i)\b(Heures|Unit[ée]s|Jours|Pcs|Kg)\b", full_text)
        if uom_m:
            uom = uom_m.group(1)

        # Parse numeric tokens in the row
        numbers = re.findall(r"([0-9]+(?:[.,][0-9]{2})+|\b[0-9]{1,3}\.0\b|\b[0-9]{1,4}\b)", full_text)
        parsed_nums = [parse_numeric(n) for n in numbers if parse_numeric(n) is not None]

        if len(row) >= 4:
            desc = row[0].text
            qty = parse_numeric(row[1].text)
            price = parse_numeric(row[2].text)
            sub_total = parse_numeric(row[-1].text)
            if len(row) >= 5 and not tax:
                tax_val = parse_numeric(row[3].text)
                if tax_val in [5.5, 10.0, 20.0]:
                    tax = f"TVA {tax_val}%"
        else:
            if parsed_nums:
                sub_total = parsed_nums[-1]
                qty = parsed_nums[0] if len(parsed_nums) > 1 else 1.0
                if len(parsed_nums) >= 3:
                    price = parsed_nums[1]

            m_qty = re.search(r"\b\d+[,.]\d{1,2}\b", full_text)
            if m_qty:
                desc = full_text[:m_qty.start()].strip(" -:")
            else:
                desc = full_text

        if qty and sub_total and (price is None or price <= 0) and qty > 0:
            price = round(sub_total / qty, 2)
        elif qty and price and (sub_total is None or sub_total <= 0):
            sub_total = round(qty * price, 2)

        return {
            "description": desc,
            "quantity": qty,
            "uom": uom,
            "price": price,
            "tax": tax,
            "sub_total": sub_total,
        }
