"""Worker background tasks for asynchronous extraction pipeline.

Implements the 4-stage OmniRoute multimodal vision pipeline:
1. Ingestion & Sandboxing (magic bytes, size limits).
2. Rasterization (pypdfium2 / Pillow / LibreOffice).
3. Vision Extraction (OmniRoute / AsyncOpenAI with model escalation).
4. Validation, Quality Score, Bounding Box Snapping & Ledger Accounting.
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from datetime import UTC, datetime
from typing import Any

from app.db.models import Job, Result, UsageLedger, User
from app.storage import storage
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from worker.config import worker_settings
from worker.db import WorkerSessionLocal
from worker.pipeline.bbox import enrich_fields_with_boxes
from worker.pipeline.escalation import EscalationPolicy
from worker.pipeline.quality import calculate_quality_score
from worker.pipeline.rasterize import rasterize_document
from worker.pipeline.understand import understand_document_vision
from worker.validators import validate_document_fields

logger = logging.getLogger("openocr.worker")


async def publish_job_event(job_id: str, stage: str, payload: dict[str, Any] | None = None) -> None:
    """Emits fine-grained progress and completion events over Redis SSE channel `sse:jobs:{job_id}`."""
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(worker_settings.REDIS_URL, socket_connect_timeout=1)
        event_data = {
            "job_id": job_id,
            "stage": stage,
            "timestamp": datetime.now(UTC).isoformat(),
            **(payload or {}),
        }
        await r.publish(f"sse:jobs:{job_id}", json.dumps(event_data))
        await r.aclose()
    except Exception as exc:
        logger.debug(f"Redis SSE publish ignored for job {job_id} ({stage}): {exc}")


async def process_document_job(ctx: dict[str, Any], job_id: str) -> dict[str, Any]:
    """Background worker task executing the end-to-end multimodal vision extraction."""
    start_time = time.time()
    logger.info(f"Worker processing vision job {job_id}")

    async with WorkerSessionLocal() as session:
        try:
            # 1. Fetch job with User relationship for tenant settings check
            stmt = select(Job).options(selectinload(Job.user)).where(Job.id == job_id)
            res = await session.execute(stmt)
            job = res.scalars().first()

            if not job:
                logger.error(f"Job {job_id} not found in database")
                return {"job_id": job_id, "status": "error", "message": "job_not_found"}

            if job.status == "done":
                logger.info(f"Job {job_id} is already completed")
                return {"job_id": job_id, "status": "done"}

            # 2. Check tenant setting: third_party_processing_allowed
            if job.user and not job.user.third_party_processing_allowed:
                if worker_settings.PROVIDER != "ollama":
                    error_msg = (
                        "Third-party AI processing is disabled for this account, "
                        "and local air-gapped provider (Ollama) is not selected."
                    )
                    logger.warning(f"Tenant isolation enforcement: {error_msg}")
                    job.status = "failed"
                    job.error_code = "THIRD_PARTY_PROCESSING_DISALLOWED"
                    job.completed_at = datetime.now(UTC)
                    job.latency_ms = int((time.time() - start_time) * 1000)
                    await session.commit()
                    await publish_job_event(job_id, "failed", {"error": error_msg, "error_code": "THIRD_PARTY_PROCESSING_DISALLOWED"})
                    return {"job_id": job_id, "status": "failed", "error": error_msg}

            # 3. Transition status: queued -> processing
            job.status = "processing"
            await session.commit()
            await session.refresh(job)

            # 4. Download document bytes from object storage
            file_bytes = storage.download_bytes(job.file_key)

            # 5. Stage 2: RASTERIZE
            await publish_job_event(job_id, "rasterizing")
            raster_doc = rasterize_document(
                file_bytes=file_bytes,
                declared_mime=job.mime,
                max_size_mb=25,
                max_pages=50,
            )
            job.pages = raster_doc.total_pages

            # 6. Stage 3 & 4: VISION EXTRACTION & VALIDATION
            await publish_job_event(job_id, "classifying")

            doc_type, enriched_fields, vision_result, issues, quality_score = (
                await understand_document_vision(
                    pages=raster_doc.pages,
                    schema_type=job.doc_type,
                    with_boxes=True,
                )
            )

            latency_ms = int((time.time() - start_time) * 1000)
            credits_to_charge = raster_doc.total_pages if not job.cached else 0

            # 7. Convert page dimensions for frontend rendering
            pages_data = [
                {
                    "page": p.page_number,
                    "width": p.width_px,
                    "height": p.height_px,
                }
                for p in raster_doc.pages
            ]

            # Reconstruct clean text summary from extracted fields
            text_lines = [f"{f['label']}: {f['value']}" for f in enriched_fields]
            reconstructed_markdown = "\n".join(text_lines)

            # Build tables_json from line_items or transactions if present
            tables_data = []
            extracted_raw = vision_result.extracted_data or {}
            raw_fields_dict = extracted_raw.get("fields", {}) if isinstance(extracted_raw, dict) else {}
            line_items = raw_fields_dict.get("line_items")
            if isinstance(line_items, list) and len(line_items) > 0:
                header = ["Description", "Quantity", "Unit Price", "Total"]
                rows = [header]
                for item in line_items:
                    if isinstance(item, dict):
                        desc = str(item.get("description") or item.get("item") or "")
                        qty = str(item.get("quantity") or item.get("qty") or "1")
                        price = str(item.get("unit_price") or item.get("rate") or "")
                        total_item = str(item.get("amount") or item.get("total") or "")
                        if desc or total_item:
                            rows.append([desc, qty, price, total_item])
                if len(rows) > 1:
                    md_rows = ["| " + " | ".join(r) + " |" for r in rows]
                    sep = "| " + " | ".join(["---"] * len(header)) + " |"
                    table_md = "\n".join([md_rows[0], sep] + md_rows[1:])
                    tables_data.append({
                        "page": 1,
                        "rows": rows,
                        "markdown": table_md,
                    })

            # Transactions for bank statements
            transactions = raw_fields_dict.get("transactions")
            if isinstance(transactions, list) and len(transactions) > 0:
                tx_header = ["Date", "Description", "Reference", "Amount", "Balance"]
                tx_rows = [tx_header]
                for tx in transactions:
                    if isinstance(tx, dict):
                        t_date = str(tx.get("date") or "")
                        t_desc = str(tx.get("description") or "")
                        t_ref = str(tx.get("reference") or "")
                        t_amt = str(tx.get("amount") or "")
                        t_bal = str(tx.get("balance") or "")
                        if t_desc or t_amt:
                            tx_rows.append([t_date, t_desc, t_ref, t_amt, t_bal])
                if len(tx_rows) > 1:
                    md_rows = ["| " + " | ".join(r) + " |" for r in tx_rows]
                    sep = "| " + " | ".join(["---"] * len(tx_header)) + " |"
                    table_md = "\n".join([md_rows[0], sep] + md_rows[1:])
                    tables_data.append({
                        "page": 1,
                        "rows": tx_rows,
                        "markdown": table_md,
                    })

            # 8. Persist Result
            engine_str = f"vision:{vision_result.model}"
            result = Result(
                job_id=job.id,
                blocks_json=[],  # Legacy layout blocks replaced by direct vision extraction
                tables_json=tables_data,
                markdown=reconstructed_markdown,
                fields_json=enriched_fields,
                summary=f"Extracted {len(enriched_fields)} fields from {doc_type} using {vision_result.model}",
                confidence=quality_score,
                quality_score=quality_score,
                validation_issues_json=[i.model_dump() for i in issues],
                model_used=vision_result.model,
                pages_json=pages_data,
                engine_version=engine_str,
                schema_version=f"{doc_type}-v1",
                prompt_version="v1",
            )
            session.add(result)

            # 9. Append-only usage ledger write with token accounting (Rule 9)
            ledger_entry = UsageLedger(
                id=str(uuid.uuid4()),
                user_id=job.user_id,
                job_id=job.id,
                credits=credits_to_charge,
                reason="document_extraction",
                prompt_tokens=vision_result.prompt_tokens,
                completion_tokens=vision_result.completion_tokens,
                model=vision_result.model,
                attempts=vision_result.attempts,
                pages=raster_doc.total_pages,
                created_at=datetime.now(UTC),
            )
            session.add(ledger_entry)

            # 10. Transition status: processing -> done
            job.doc_type = doc_type
            job.status = "done"
            job.latency_ms = latency_ms
            job.credits_charged = credits_to_charge
            job.completed_at = datetime.now(UTC)

            await session.commit()
            logger.info(
                f"Job {job_id} successfully extracted via {vision_result.model} "
                f"({raster_doc.total_pages} pages, quality={quality_score}, latency={latency_ms}ms)"
            )

            await publish_job_event(
                job_id,
                "completed",
                {
                    "model_used": vision_result.model,
                    "quality_score": quality_score,
                    "pages": raster_doc.total_pages,
                    "doc_type": doc_type,
                },
            )

            return {
                "job_id": job_id,
                "status": "done",
                "model_used": vision_result.model,
                "quality_score": quality_score,
                "latency_ms": latency_ms,
            }

        except Exception as exc:
            await session.rollback()
            logger.exception(f"Error processing vision job {job_id}: {exc}")
            try:
                stmt = select(Job).where(Job.id == job_id)
                res = await session.execute(stmt)
                failed_job = res.scalars().first()
                if failed_job:
                    failed_job.status = "failed"
                    failed_job.error_code = "EXTRACTION_FAILED"
                    failed_job.latency_ms = int((time.time() - start_time) * 1000)
                    failed_job.completed_at = datetime.now(UTC)
                    await session.commit()
            except Exception as inner_e:
                logger.error(f"Failed to update failed status for job {job_id}: {inner_e}")

            await publish_job_event(job_id, "failed", {"error": str(exc), "error_code": "EXTRACTION_FAILED"})
            return {"job_id": job_id, "status": "failed", "error": str(exc)}
