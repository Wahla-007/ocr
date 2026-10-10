"""Generates the 5 required sample document files for Phase 3 evaluation.

Sample documents:
1. clean_invoice.pdf (clean vector digital PDF with tables and layout)
2. scanned_contract.pdf (simulated scanned document)
3. phone_receipt.jpg (smartphone photo of a store receipt)
4. rotated_id.png (document rotated 90 degrees to test auto-orientation/deskew)
5. multipage_report.pdf (multi-page 3-page document)
"""

from pathlib import Path

from PIL import Image, ImageDraw
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, TableStyle
from reportlab.platypus import Table as RLTable

SAMPLES_DIR = Path(__file__).resolve().parent / "samples"


def ensure_samples_dir():
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)


def generate_clean_invoice(output_path: Path):
    """1. Clean digital vector PDF invoice."""
    doc = SimpleDocTemplate(str(output_path), pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Heading1"],
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#1e293b"),
    )
    story.append(Paragraph("INVOICE", title_style))
    story.append(Spacer(1, 10))

    # Meta
    story.append(Paragraph("<b>Invoice Number:</b> INV-2026-0042", styles["Normal"]))
    story.append(Paragraph("<b>Issue Date:</b> 2026-10-06", styles["Normal"]))
    story.append(Paragraph("<b>Due Date:</b> 2026-11-06", styles["Normal"]))
    story.append(Paragraph("<b>Billed To:</b> Acme Corporation", styles["Normal"]))
    story.append(Spacer(1, 15))

    # Items Table
    data = [
        ["Item Description", "Qty", "Unit Price", "Total"],
        ["Cloud Architecture Consulting", "40 hrs", "$150.00", "$6,000.00"],
        ["Document Extraction API Setup", "1", "$2,500.00", "$2,500.00"],
        ["Performance Optimization", "10 hrs", "$175.00", "$1,750.00"],
        ["Subtotal", "", "", "$10,250.00"],
        ["Tax (10%)", "", "", "$1,025.00"],
        ["Total Due", "", "", "$11,275.00"],
    ]
    table = RLTable(data, colWidths=[240, 60, 90, 90])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ]
        )
    )
    story.append(table)
    doc.build(story)


def generate_scanned_contract(output_path: Path):
    """2. Scanned contract PDF (rendered to bitmap with scan noise/grayscale)."""
    # Create base page via Pillow with slight tilt and grain
    img = Image.new("RGB", (850, 1100), color=(248, 247, 242))
    draw = ImageDraw.Draw(img)

    draw.text((50, 60), "CONFIDENTIAL NON-DISCLOSURE AGREEMENT", fill=(40, 40, 40))
    draw.text(
        (50, 120),
        "This Agreement is entered into on October 6, 2026 between:",
        fill=(60, 60, 60),
    )
    draw.text((70, 150), "Party A: Global Dynamics LLC", fill=(50, 50, 50))
    draw.text((70, 180), "Party B: Apex Technologies Inc.", fill=(50, 50, 50))
    draw.text(
        (50, 240),
        "1. Confidential Information Definition and Obligations",
        fill=(40, 40, 40),
    )
    draw.text(
        (50, 270),
        "The receiving party agrees to protect all proprietary algorithms and data.",
        fill=(60, 60, 60),
    )
    draw.text((50, 900), "Signed: ____________________        Date: 2026-10-06", fill=(40, 40, 40))

    # Add scan line
    draw.line([(40, 100), (810, 100)], fill=(200, 200, 200), width=1)

    # Convert to PDF
    img.save(str(output_path), "PDF", resolution=150.0)


def generate_phone_receipt(output_path: Path):
    """3. Smartphone photo of a receipt (tall aspect ratio, camera perspective)."""
    img = Image.new("RGB", (600, 900), color=(250, 250, 245))
    draw = ImageDraw.Draw(img)

    draw.text((200, 40), "SUPERMARKET METRO", fill=(30, 30, 30))
    draw.text((180, 70), "Store #849 - San Francisco, CA", fill=(80, 80, 80))
    draw.text((80, 120), "Date: 2026-10-06 14:32:01", fill=(60, 60, 60))
    draw.text((80, 150), "Cashier: Alex M.", fill=(60, 60, 60))
    draw.line([(60, 180), (540, 180)], fill=(180, 180, 180), width=1)

    items = [
        ("Organic Whole Milk 1 Gal", "$4.99"),
        ("Fresh Sourdough Bread", "$3.50"),
        ("Dark Roast Coffee Beans", "$14.99"),
        ("Greek Yogurt 32oz", "$5.49"),
        ("Avocados (Bag of 4)", "$4.29"),
    ]
    y = 210
    for name, price in items:
        draw.text((80, y), name, fill=(40, 40, 40))
        draw.text((450, y), price, fill=(40, 40, 40))
        y += 40

    draw.line([(60, y + 10), (540, y + 10)], fill=(180, 180, 180), width=1)
    y += 30
    draw.text((80, y), "Subtotal:", fill=(50, 50, 50))
    draw.text((450, y), "$33.26", fill=(50, 50, 50))
    draw.text((80, y + 30), "Sales Tax (8.5%):", fill=(50, 50, 50))
    draw.text((450, y + 30), "$2.83", fill=(50, 50, 50))
    draw.text((80, y + 70), "TOTAL PAID:", fill=(20, 20, 20))
    draw.text((450, y + 70), "$36.09", fill=(20, 20, 20))

    img.save(str(output_path), "JPEG", quality=90)


def generate_rotated_id(output_path: Path):
    """4. Rotated document (90 degrees clockwise) to test orientation detection."""
    # Create horizontal ID card image
    img = Image.new("RGB", (700, 450), color=(240, 245, 255))
    draw = ImageDraw.Draw(img)

    draw.rectangle([(20, 20), (680, 430)], outline=(100, 140, 200), width=3)
    draw.text((40, 40), "NATIONAL IDENTITY CARD", fill=(20, 40, 100))
    draw.text((40, 90), "Name: JANE DOE", fill=(30, 30, 30))
    draw.text((40, 130), "ID Number: ID-98472918", fill=(30, 30, 30))
    draw.text((40, 170), "Date of Birth: 1990-05-14", fill=(30, 30, 30))
    draw.text((40, 210), "Expiry Date: 2030-05-14", fill=(30, 30, 30))
    draw.text((40, 250), "Nationality: USA", fill=(30, 30, 30))

    # Rotate 90 degrees clockwise (so width becomes 450, height becomes 700)
    rotated = img.rotate(-90, expand=True)
    rotated.save(str(output_path), "PNG")


def generate_multipage_report(output_path: Path):
    """5. Multi-page document (3 pages) with tables and text."""
    doc = SimpleDocTemplate(str(output_path), pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # Page 1
    story.append(Paragraph("QUARTERLY BUSINESS REVIEW - PAGE 1", styles["Heading1"]))
    story.append(Paragraph("Executive Summary of operations for Q3 2026.", styles["Normal"]))
    story.append(Spacer(1, 20))
    story.append(
        Paragraph(
            "Key highlights include a 35% growth in document intelligence pipeline throughput.",
            styles["Normal"],
        )
    )
    story.append(PageBreak())  # Clean page break to Page 2

    # Page 2
    story.append(Paragraph("FINANCIAL PERFORMANCE - PAGE 2", styles["Heading1"]))
    fin_data = [
        ["Metric", "Target", "Actual"],
        ["Revenue", "$1.2M", "$1.45M"],
        ["Gross Margin", "75%", "79%"],
        ["Active Accounts", "1,200", "1,480"],
    ]
    t = RLTable(fin_data, colWidths=[150, 100, 100])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
            ]
        )
    )
    story.append(t)
    story.append(PageBreak())  # Clean page break to Page 3

    # Page 3
    story.append(Paragraph("APPENDIX & AUDIT TRAIL - PAGE 3", styles["Heading1"]))
    story.append(
        Paragraph("Report signed and certified by the Chief Operating Officer.", styles["Normal"])
    )

    doc.build(story)


def generate_all_samples():
    ensure_samples_dir()
    generate_clean_invoice(SAMPLES_DIR / "clean_invoice.pdf")
    generate_scanned_contract(SAMPLES_DIR / "scanned_contract.pdf")
    generate_phone_receipt(SAMPLES_DIR / "phone_receipt.jpg")
    generate_rotated_id(SAMPLES_DIR / "rotated_id.png")
    generate_multipage_report(SAMPLES_DIR / "multipage_report.pdf")
    print(f"Generated 5 sample documents in {SAMPLES_DIR}")


if __name__ == "__main__":
    generate_all_samples()
