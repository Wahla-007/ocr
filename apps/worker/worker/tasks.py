"""Worker background tasks for asynchronous extraction pipeline."""

import logging
import time
import uuid
from datetime import UTC, datetime
from typing import Any

from app.db.models import Job, Result, UsageLedger
from app.storage import storage
from sqlalchemy import select
from worker.db import WorkerSessionLocal
from worker.pipeline.normalize import normalize_document
from worker.pipeline.parse import parse_document
from worker.pipeline.understand import classify_and_extract

logger = logging.getLogger("openocr.worker")


async def process_document_job(ctx: dict[str, Any], job_id: str) -> dict[str, Any]:
    """Background task to run full extraction pipeline.

    Stages:
    1. Normalize: validate magic bytes, render pages, auto-rotate, cap resolution
    2. Parse: ParseEngine layout & OCR (Docling with automatic PaddleOCR fallback)
    3. Persist & Charge: save parsed blocks, bboxes, tables, markdown, write ledger
    """
    start_time = time.time()
    logger.info(f"Worker processing job {job_id}")

    async with WorkerSessionLocal() as session:
        try:
            # 1. Fetch job
            stmt = select(Job).where(Job.id == job_id)
            res = await session.execute(stmt)
            job = res.scalars().first()

            if not job:
                logger.error(f"Job {job_id} not found in database")
                return {"job_id": job_id, "status": "error", "message": "job_not_found"}

            if job.status == "done":
                logger.info(f"Job {job_id} is already completed")
                return {"job_id": job_id, "status": "done"}

            # 2. Transition status: queued -> processing
            job.status = "processing"
            await session.commit()
            await session.refresh(job)

            # 3. Download document bytes from object storage
            file_bytes = storage.download_bytes(job.file_key)

            # 4. Stage 1: NORMALIZE
            normalized_doc = normalize_document(
                file_bytes=file_bytes,
                declared_mime=job.mime,
                max_size_mb=25,
                max_pages=50,
            )
            job.pages = normalized_doc.total_pages

            # 5. Stage 2: PARSE (Docling with Fallback)
            parse_result = await parse_document(
                file_bytes=file_bytes,
                mime_type=normalized_doc.mime,
            )

            # Convert parsed blocks and tables to serializable dictionaries
            blocks_data = [
                {
                    "type": b.type,
                    "text": b.text,
                    "page": b.page,
                    "confidence": b.confidence,
                    "bbox": b.bbox.model_dump() if b.bbox else None,
                }
                for b in parse_result.blocks
            ]

            tables_data = [
                {
                    "page": t.page,
                    "rows": t.rows,
                    "markdown": t.markdown,
                    "bbox": t.bbox.model_dump() if t.bbox else None,
                }
                for t in parse_result.tables
            ]

            # 6. Stage 3 & 4: UNDERSTAND (Classify, Extract & Bbox Mapping)
            classification, extraction = await classify_and_extract(
                parsed_text=parse_result.markdown,
                blocks=parse_result.blocks,
            )

            fields_data = [
                {
                    "key": f.key,
                    "label": f.label,
                    "value": f.value,
                    "confidence": f.confidence,
                    "page": f.page or 1,
                    "bbox": f.bbox.model_dump() if f.bbox else None,
                }
                for f in extraction.fields
                if f.value is not None and str(f.value).strip() != ""
            ]

            latency_ms = int((time.time() - start_time) * 1000)
            credits_to_charge = normalized_doc.total_pages if not job.cached else 0

            # 7. Persist Result
            overall_conf = round((parse_result.confidence + extraction.overall_confidence) / 2, 2)
            result = Result(
                job_id=job.id,
                blocks_json=blocks_data,
                tables_json=tables_data,
                markdown=parse_result.markdown,
                fields_json=fields_data,
                summary=extraction.summary,
                confidence=overall_conf,
                engine_version=parse_result.engine_version,
                schema_version=f"{classification.doc_type}-v1",
                prompt_version=f"extract.{classification.doc_type}.v1",
            )
            session.add(result)

            # 8. Append-only usage ledger write (Rule 9)
            if credits_to_charge > 0:
                ledger_entry = UsageLedger(
                    id=str(uuid.uuid4()),
                    user_id=job.user_id,
                    job_id=job.id,
                    credits=credits_to_charge,
                    reason="document_extraction",
                    created_at=datetime.now(UTC),
                )
                session.add(ledger_entry)

            # 9. Transition status: processing -> done
            job.doc_type = classification.doc_type
            job.status = "done"
            job.latency_ms = latency_ms
            job.credits_charged = credits_to_charge
            job.completed_at = datetime.now(UTC)

            await session.commit()
            logger.info(f"Job {job_id} parsed with {parse_result.engine_name} ({latency_ms}ms)")
            return {"job_id": job_id, "status": "done", "latency_ms": latency_ms}

        except Exception as exc:
            await session.rollback()
            logger.exception(f"Error processing job {job_id}: {exc}")
            try:
                stmt = select(Job).where(Job.id == job_id)
                res = await session.execute(stmt)
                failed_job = res.scalars().first()
                if failed_job:
                    failed_job.status = "failed"
                    failed_job.error_code = "ENGINE_FAILED"
                    failed_job.latency_ms = int((time.time() - start_time) * 1000)
                    failed_job.completed_at = datetime.now(UTC)
                    await session.commit()
            except Exception as inner_e:
                logger.error(f"Failed to update failed status for job {job_id}: {inner_e}")

            return {"job_id": job_id, "status": "failed", "error": str(exc)}
