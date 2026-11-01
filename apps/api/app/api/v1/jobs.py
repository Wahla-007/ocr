"""Extract and Job status endpoints.

Adheres strictly to Section 5 API contracts.
"""

import asyncio
import hashlib
import json
import re
import time
import uuid
from datetime import UTC, datetime

import httpx
import redis.asyncio as aioredis
from starlette.responses import StreamingResponse
from app.api.v1.auth import get_optional_user
from app.config import settings
from app.db.models import Job, Result, User
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
            _EMPTY_VALUES = {"", "null", "none", "n/a", "na", "not applicable", "not specified", "unspecified", "unknown", "-", "--", "undefined"}
            resp.fields = [
                ExtractedField(
                    key=f.get("key", ""),
                    label=f.get("label", ""),
                    value=f.get("value"),
                    confidence=f.get("confidence", 0.0),
                    page=f.get("page", 1),
                    bbox=BoundingBox(**f["bbox"]) if f.get("bbox") else None,
                    box_source=f.get("box_source"),
                )
                for f in res.fields_json
                if f.get("value") is not None and str(f.get("value")).strip().lower() not in _EMPTY_VALUES
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

        resp.model_used = res.model_used
        resp.quality_score = res.quality_score
        resp.validation_issues = res.validation_issues_json
        resp.page_dimensions = res.pages_json
        resp.engine = res.engine_version

        if res.pages_json:
            resp.page_sizes = [
                PageSize(
                    page=p.get("page", 1),
                    width=float(p.get("width", 1000.0)),
                    height=float(p.get("height", 1400.0)),
                )
                for p in res.pages_json
            ]
        else:
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
    schema: str = Query("auto", description="Target document schema or auto"),
    file: UploadFile | None = File(None),
    body: ExtractUrlRequest | None = None,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
    authorization: str | None = Header(None),
):
    plan_name = "free" if authorization or user else "anonymous"
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

    # 2. Compute SHA-256 for Idempotency and Caching with Prompt Version, Schema Type, and Extraction Mode
    dedup_input = (
        content_bytes
        + f":{settings.PROMPT_VERSION}:{schema}:{settings.EXTRACTION_MODE}".encode("utf-8")
    )
    file_hash = hashlib.sha256(dedup_input).hexdigest()
    job_id = f"job_{uuid.uuid4().hex[:12]}"

    user_id = user.id if user else None
    user_filter = Job.user_id == user_id if user_id else Job.user_id.is_(None)

    # Check for existing completed job with identical content hash for this tenant
    stmt = (
        select(Job)
        .options(selectinload(Job.result))
        .where(Job.file_hash == file_hash, Job.status == "done", user_filter)
        .order_by(Job.created_at.desc())
    )
    result = await db.execute(stmt)
    existing_job = result.scalars().first()

    if existing_job and existing_job.result:
        logger.info(
            f"Cache HIT for file_hash {file_hash} (tenant: {user_id}). Returning cached job result at 0 credits."
        )
        # Create a new job marked as cached with 0 credits charged
        new_job = Job(
            id=job_id,
            user_id=user_id,
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
            model_used=cached_res.model_used,
            quality_score=cached_res.quality_score,
            validation_issues_json=cached_res.validation_issues_json,
            pages_json=cached_res.pages_json,
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
        user_id=user_id,
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
    user: User | None = Depends(get_optional_user),
    authorization: str | None = Header(None),
):
    plan_name = "free" if authorization or user else "anonymous"
    plan = settings.get_plan_limits(plan_name)
    inject_quota_headers(response, plan)

    stmt = select(Job).options(selectinload(Job.result)).where(Job.id == id)
    res = await db.execute(stmt)
    job = res.scalars().first()

    if not job:
        raise JobNotFoundError(id)

    # Tenant check: if job has a user_id and an authenticated user requested it, ensure tenant match
    if job.user_id and user and job.user_id != user.id and not getattr(user, "is_admin", False):
        raise JobNotFoundError(id)

    job_resp = build_job_response(job)
    if format.lower() == "markdown":
        return Response(content=job_resp.markdown or "", media_type="text/markdown")
    elif format.lower() in ["text", "plain_text", "txt"]:
        return Response(content=job_resp.text or "", media_type="text/plain")
    return job_resp


@router.get(
    "/jobs/{id}/stream",
    summary="Stream extraction job progress events via SSE",
)
async def stream_job_events(
    id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    """Emits server-sent events as the worker transitions through vision pipeline stages:

    rasterizing, classifying, extracting, validating, escalating, completed, failed.
    """
    stmt = select(Job).options(selectinload(Job.result)).where(Job.id == id)
    res = await db.execute(stmt)
    job = res.scalars().first()

    if not job:
        raise JobNotFoundError(id)

    if job.user_id and user and job.user_id != user.id and not getattr(user, "is_admin", False):
        raise JobNotFoundError(id)

    async def event_generator():
        # If job is already finished, yield terminal event immediately
        if job.status in ["done", "completed"]:
            payload = {
                "job_id": job.id,
                "stage": "completed",
                "timestamp": datetime.now(UTC).isoformat(),
                "status": "completed",
            }
            yield f"event: completed\ndata: {json.dumps(payload)}\n\n"
            return
        elif job.status == "failed":
            payload = {
                "job_id": job.id,
                "stage": "failed",
                "timestamp": datetime.now(UTC).isoformat(),
                "status": "failed",
                "error": job.error_code or "Job failed",
                "error_code": job.error_code,
            }
            yield f"event: failed\ndata: {json.dumps(payload)}\n\n"
            return

        # Connect to Redis PubSub
        r = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        pubsub = r.pubsub()
        channel_name = f"sse:jobs:{id}"
        await pubsub.subscribe(channel_name)

        try:
            # Yield initial state
            yield f"event: queued\ndata: {json.dumps({'job_id': id, 'stage': 'queued', 'timestamp': datetime.now(UTC).isoformat()})}\n\n"

            timeout_seconds = 120
            start_stream = time.time()
            while time.time() - start_stream < timeout_seconds:
                if await request.is_disconnected():
                    break

                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message.get("type") == "message":
                    raw_data = message.get("data")
                    if isinstance(raw_data, bytes):
                        raw_data = raw_data.decode("utf-8")

                    stage = "message"
                    try:
                        parsed = json.loads(raw_data)
                        stage = parsed.get("stage", "message")
                    except Exception:
                        pass

                    yield f"event: {stage}\ndata: {raw_data}\n\n"

                    if stage in ["completed", "failed"]:
                        break
                else:
                    # Periodically yield a keepalive ping comment
                    yield ": ping\n\n"
                    await asyncio.sleep(0.5)
        finally:
            await pubsub.unsubscribe(channel_name)
            await pubsub.close()
            await r.aclose()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
