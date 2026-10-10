"""Tests for SQLAlchemy database models and table definitions."""

from app.db.models import (
    ApiKey,
    Base,
    DocumentSchema,
    Job,
    Result,
    UsageLedger,
    User,
    Webhook,
    WebhookDelivery,
)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


def test_models_schema_and_tables():
    """Verify all 8 Section 4 models create properly in database schema."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()

    # 1. Test User
    user = User(id="user_123", email="tester@example.com", plan="starter")
    session.add(user)
    session.commit()

    # 2. Test ApiKey
    key = ApiKey(
        id="key_123",
        user_id=user.id,
        name="Production Key",
        key_prefix="sk_live_1234",
        key_hash="hash_value_here",
    )
    session.add(key)
    session.commit()

    # 3. Test Job
    job = Job(
        id="job_abc123",
        user_id=user.id,
        status="done",
        file_key="uploads/test.pdf",
        file_hash="sha256hash123",
        mime="application/pdf",
        size_bytes=1048576,
        pages=2,
        doc_type="invoice",
        credits_charged=2,
    )
    session.add(job)
    session.commit()

    # 4. Test Result
    result = Result(
        job_id=job.id,
        blocks_json=[{"type": "title", "text": "Invoice #100", "page": 1, "confidence": 0.99}],
        tables_json=[{"page": 1, "rows": [["Item", "Price"]], "markdown": "| Item | Price |"}],
        markdown="# Invoice\nTotal: $100",
        fields_json=[{"key": "total", "label": "Total", "value": "100.00", "confidence": 0.99}],
        summary="A test invoice",
        confidence=0.98,
        engine_version="docling-1.0.0",
        schema_version="invoice-v1",
        prompt_version="extract.invoice.v1",
    )
    session.add(result)
    session.commit()

    # 5. Test UsageLedger (Append-only)
    ledger_entry = UsageLedger(
        id="ledger_001",
        user_id=user.id,
        job_id=job.id,
        credits=2,
        reason="document_extraction",
    )
    session.add(ledger_entry)
    session.commit()

    # 6. Test DocumentSchema
    doc_schema = DocumentSchema(
        doc_type="invoice",
        version="v1",
        json_schema={"type": "object", "properties": {"total": {"type": "string"}}},
        prompt_file="extract.invoice.v1.md",
        active=True,
    )
    session.add(doc_schema)
    session.commit()

    # 7. Test Webhook
    webhook = Webhook(
        id="wh_001",
        user_id=user.id,
        url="https://example.com/webhook",
        secret="whsec_123",
        events=["job.completed", "job.failed"],
    )
    session.add(webhook)
    session.commit()

    # 8. Test WebhookDelivery
    delivery = WebhookDelivery(
        id="deliv_001",
        webhook_id=webhook.id,
        job_id=job.id,
        status_code=200,
        response_body="OK",
        success=True,
    )
    session.add(delivery)
    session.commit()

    # Assertions
    fetched_user = session.query(User).filter_by(id="user_123").first()
    assert fetched_user is not None
    assert fetched_user.email == "tester@example.com"
    assert len(fetched_user.api_keys) == 1
    assert len(fetched_user.jobs) == 1
    assert fetched_user.jobs[0].result is not None
    assert fetched_user.jobs[0].result.summary == "A test invoice"

    session.close()
