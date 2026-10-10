"""Extract and Job status endpoints.

Adheres strictly to Section 5 API contracts.
"""

import asyncio
import hashlib
import re
import time
import uuid
from datetime import UTC, datetime

import httpx
from app.config import settings
from app.db.models import Job, Result
from app.db.session import get_db
from app.errors import BadRequestError, JobNotFoundError
from app.logging import logger
from app.queue import enqueue_job
from app.quota import inject_quota_headers
from app.schemas.jobs import (
    Block,
    BoundingBox,
    ExtractedField,
    ExtractUrlRequest,
    JobCreatedResponse,
    JobResponse,
    PageSize,
    Table,
    Versions,
)
from app.storage import storage
from app.validation import validate_file
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Header,
    Query,
    Request,
    Response,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

router = APIRouter(tags=["Extract & Jobs"])


def markdown_to_plain_text(md: str | None) -> str:
    if not md:
        return ""
    text = re.sub(r"#+\s*", "", md)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"\|[ -|]+\|", "", text)
    text = re.sub(r"\|", " ", text)
    return text.strip()


def build_job_response(job: Job) -> JobResponse:
    """Serializes SQLAlchemy Job and Result models into Section 5 JobResponse."""
    resp = JobResponse(
        id=job.id,
        status=job.status,
        pages=job.pages,
        doc_type=job.doc_type,
        cached=job.cached,
        credits_charged=job.credits_charged,
        error_code=job.error_code,
        latency_ms=job.latency_ms,
        created_at=job.created_at.isoformat() if job.created_at else None,
        completed_at=job.completed_at.isoformat() if job.completed_at else None,
    )

    if job.result:
        res = job.result
        resp.summary = res.summary
        resp.confidence = res.confidence
        resp.markdown = res.markdown
        resp.text = markdown_to_plain_text(res.markdown)
        resp.doc_type_confidence = res.confidence

        if res.fields_json:
            resp.fields = [
                ExtractedField(
                    key=f.get("key", ""),
                    label=f.get("label", ""),
                    value=f.get("value"),
                    confidence=f.get("confidence", 0.0),
                    page=f.get("page", 1),
                    bbox=BoundingBox(**f["bbox"]) if f.get("bbox") else None,
                )
                for f in res.fields_json
            ]

        if res.blocks_json:
            resp.blocks = [
                Block(
                    type=b.get("type", "paragraph"),
                    text=b.get("text", ""),
                    page=b.get("page", 1),
                    confidence=b.get("confidence", 0.0),
                    bbox=BoundingBox(**b["bbox"]) if b.get("bbox") else None,
                )
                for b in res.blocks_json
            ]

        if res.tables_json:
            resp.tables = [
                Table(
                    page=t.get("page", 1),
                    rows=t.get("rows", []),
                    markdown=t.get("markdown", ""),
                )
                for t in res.tables_json
            ]

        resp.versions = Versions(
            engine=res.engine_version,
            schema=res.schema_version,
            prompt=res.prompt_version,
        )

        resp.page_sizes = [PageSize(page=1, width=1000.0, height=1400.0)]

    return resp


@router.post(
    "/extract",
    status_code=status.HTTP_200_OK,
    summary="Extract document intelligence (Zero Selection)",
)
async def extract_document(
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    wait: bool = Query(False, description="Wait for completion up to 30s"),
    format: str = Query("json", description="Output format: json, markdown, or text"),
    file: UploadFile | None = File(None),
    body: ExtractUrlRequest | None = None,
    db: AsyncSession = Depends(get_db),
    authorization: str | None = Header(None),
):
    plan_name = "free" if authorization else "anonymous"
    plan = settings.get_plan_limits(plan_name)
    inject_quota_headers(response, plan)

    content_bytes: bytes | None = None
    file_key: str | None = None
    mime: str | None = None
    size_bytes: int = 0

    # 1. Acquire bytes from file, url, or direct file_key
    if file is not None:
        content_bytes = await file.read()
        size_bytes = len(content_bytes)
        mime = validate_file(content_bytes, file.content_type, plan.max_file_size_mb)
        unique_id = str(uuid.uuid4())
        safe_name = "".join(c for c in (file.filename or "doc") if c.isalnum() or c in "._- ")
        file_key = f"uploads/{unique_id}/{safe_name}"
        storage.upload_bytes(file_key, content_bytes, mime)
    elif body and body.url:
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                res = await client.get(body.url)
                if res.status_code != 200:
                    raise BadRequestError(
                        f"Failed to fetch document from URL: HTTP {res.status_code}"
                    )
                content_bytes = res.content
                size_bytes = len(content_bytes)
                mime = validate_file(content_bytes, None, plan.max_file_size_mb)
                unique_id = str(uuid.uuid4())
                file_key = f"uploads/{unique_id}/downloaded_doc"
                storage.upload_bytes(file_key, content_bytes, mime)
            except httpx.RequestError as e:
                raise BadRequestError(f"Could not reach URL: {e}") from e
    elif body and body.file_key:
        file_key = body.file_key
        try:
            content_bytes = storage.download_bytes(file_key)
            size_bytes = len(content_bytes)
            mime = validate_file(content_bytes, None, plan.max_file_size_mb)
        except Exception as e:
            raise BadRequestError(f"Specified file_key could not be read: {e}") from e
    else:
        # Check if multipart sent file_key or url as form field
        raise BadRequestError("Must provide document via file upload, 'url', or 'file_key'.")

    # 2. Compute SHA-256 for Idempotency and Caching (Rule 8)
    file_hash = hashlib.sha256(content_bytes).hexdigest()
    job_id = f"job_{uuid.uuid4().hex[:12]}"

    # Check for existing completed job with identical content hash
    stmt = (
        select(Job)
        .options(selectinload(Job.result))
        .where(Job.file_hash == file_hash, Job.status == "done")
        .order_by(Job.created_at.desc())
    )
    result = await db.execute(stmt)
    existing_job = result.scalars().first()

    if existing_job and existing_job.result:
        logger.info(
            f"Cache HIT for file_hash {file_hash}. Returning cached job result at 0 credits."
        )
        # Create a new job marked as cached with 0 credits charged
        new_job = Job(
            id=job_id,
            user_id=None,
            status="done",
            file_key=file_key,
            file_hash=file_hash,
            mime=mime,
            size_bytes=size_bytes,
            pages=existing_job.pages,
            doc_type=existing_job.doc_type,
            latency_ms=10,
            credits_charged=0,
            cached=True,
            completed_at=datetime.now(UTC),
        )
        db.add(new_job)

        # Clone result
        cached_res = existing_job.result
        new_result = Result(
            job_id=job_id,
            blocks_json=cached_res.blocks_json,
            tables_json=cached_res.tables_json,
            markdown=cached_res.markdown,
            fields_json=cached_res.fields_json,
            summary=cached_res.summary,
            confidence=cached_res.confidence,
            engine_version=cached_res.engine_version,
            schema_version=cached_res.schema_version,
            prompt_version=cached_res.prompt_version,
        )
        db.add(new_result)
        new_job.result = new_result
        await db.commit()

        if wait:
            job_resp = build_job_response(new_job)
            if format.lower() == "markdown":
                return Response(content=job_resp.markdown or "", media_type="text/markdown")
            elif format.lower() in ["text", "plain_text", "txt"]:
                return Response(content=job_resp.text or "", media_type="text/plain")
            return job_resp
        return JobCreatedResponse(id=job_id, status="done")

    # 3. New Job: create in 'queued' status
    job = Job(
        id=job_id,
        user_id=None,
        status="queued",
        file_key=file_key,
        file_hash=file_hash,
        mime=mime,
        size_bytes=size_bytes,
        pages=1,
        credits_charged=0,
        cached=False,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # 4. Dispatch to worker queue
    enqueued = await enqueue_job(job_id)
    if not enqueued:
        # Fallback local direct processing if worker queue is unavailable (e.g. testing)
        from worker.tasks import process_document_job

        background_tasks.add_task(process_document_job, {}, job_id)

    # 5. Handle ?wait=true mode
    if wait:
        start_wait = time.time()
        timeout_seconds = 25
        while time.time() - start_wait < timeout_seconds:
            await asyncio.sleep(0.5)
            # Re-fetch job
            db.expire_all()
            updated_job_query = await db.execute(
                select(Job).options(selectinload(Job.result)).where(Job.id == job_id)
            )
            current_job = updated_job_query.scalars().first()
            if current_job and current_job.status in ["done", "failed"]:
                job_resp = build_job_response(current_job)
                if format.lower() == "markdown":
                    return Response(content=job_resp.markdown or "", media_type="text/markdown")
                elif format.lower() in ["text", "plain_text", "txt"]:
                    return Response(content=job_resp.text or "", media_type="text/plain")
                return job_resp

        # If timed out waiting, return queued state
        return JobCreatedResponse(id=job_id, status=job.status)

    # Return async response
    return JobCreatedResponse(id=job_id, status="queued")


@router.get(
    "/jobs/{id}",
    summary="Get extraction job status and result",
)
async def get_job_status(
    id: str,
    response: Response,
    format: str = Query("json", description="Output format: json, markdown, or text"),
    db: AsyncSession = Depends(get_db),
    authorization: str | None = Header(None),
):
    plan_name = "free" if authorization else "anonymous"
    plan = settings.get_plan_limits(plan_name)
    inject_quota_headers(response, plan)

    stmt = select(Job).options(selectinload(Job.result)).where(Job.id == id)
    res = await db.execute(stmt)
    job = res.scalars().first()

    if not job:
        raise JobNotFoundError(id)

    job_resp = build_job_response(job)
    if format.lower() == "markdown":
        return Response(content=job_resp.markdown or "", media_type="text/markdown")
    elif format.lower() in ["text", "plain_text", "txt"]:
        return Response(content=job_resp.text or "", media_type="text/plain")
    return job_resp
