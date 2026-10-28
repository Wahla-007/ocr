"""Production-grade Authentication & Session Management Router (OWASP ASVS L2 / NIST SP 800-63B)."""

from datetime import UTC, datetime, timedelta
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import OneTimeToken, Session as DbSession, User, ensure_utc, utc_now
from app.db.session import get_db
from app.logging import logger
from app.middleware.security import validate_internal_redirect
from app.schemas.auth import (
    AuthUserResponse,
    ForgotPasswordRequest,
    GenericSuccessResponse,
    LoginRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    SessionInfoResponse,
    SignupRequest,
    SignupResponse,
    VerifyEmailRequest,
)
from app.security.cookies import (
    clear_session_cookie,
    extract_session_token,
    set_csrf_cookie,
    set_session_cookie,
)
from app.security.password import (
    check_haveibeenpwned_breach,
    dummy_verify,
    hash_password,
    normalize_email,
    validate_nist_password,
    verify_password,
)
from app.security.tokens import (
    generate_secure_token,
    hash_token,
    verify_token_constant_time,
)
from app.services.email import EmailService, mask_email

router = APIRouter(prefix="/auth", tags=["Authentication"])

SESSION_IDLE_TIMEOUT = timedelta(hours=2)
SESSION_DEFAULT_LIFETIME = timedelta(hours=24)
SESSION_REMEMBER_LIFETIME = timedelta(days=14)
LOCKOUT_DURATION = timedelta(minutes=15)
MAX_FAILED_ATTEMPTS = 5


async def get_current_user_and_session(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> tuple[User, DbSession]:
    """Dependency extracting and validating the active authenticated session."""
    raw_token = extract_session_token(request)
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHENTICATED", "message": "Authentication session required."},
        )

    token_hash = hash_token(raw_token)
    stmt = (
        select(DbSession, User)
        .join(User, DbSession.user_id == User.id)
        .where(
            DbSession.session_hash == token_hash,
            DbSession.revoked_at.is_(None),
            DbSession.expires_at > utc_now(),
        )
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "SESSION_EXPIRED", "message": "Session has expired or was revoked."},
        )

    db_session, user = row

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_DISABLED", "message": "Account has been deactivated."},
        )

    # Idle timeout check
    now = utc_now()
    last_seen = ensure_utc(db_session.last_seen_at) or now
    if now - last_seen > SESSION_IDLE_TIMEOUT:
        db_session.revoked_at = now
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "SESSION_IDLE_TIMEOUT", "message": "Session expired due to inactivity."},
        )

    # Touch last_seen_at
    db_session.last_seen_at = now
    await db.commit()

    return user, db_session


async def get_current_user(
    auth_data: tuple[User, DbSession] = Depends(get_current_user_and_session),
) -> User:
    """Convenience dependency returning only the authenticated user."""
    return auth_data[0]


@router.post("/signup", response_model=SignupResponse)
async def signup(
    payload: SignupRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Production-grade user registration:
    - Normalizes email (NFKC, lowercase, control characters rejected)
    - Validates NIST SP 800-63B password rules (length, Unicode, no truncation)
    - Checks HaveIBeenPwned k-anonymity breach database (fails open with logging)
    - Honeypot bot trapping
    - Anti-enumeration defense (identical response and timing on existing email)
    - Race condition handling with database unique constraint
    - Cryptographically random single-use verification token (256-bit CSPRNG)
    """
    # 1. Honeypot Trap
    if payload.honeypot:
        logger.warning(f"Bot detected via honeypot signup attempt from IP: {request.client.host if request.client else 'unknown'}")
        return SignupResponse()

    # 2. Email Normalization
    try:
        clean_email = normalize_email(payload.email)
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "INVALID_EMAIL", "message": str(err)},
        )

    # 3. NIST Password Policy Validation
    try:
        validate_nist_password(payload.password, user_email=clean_email)
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "WEAK_PASSWORD", "message": str(err)},
        )

    # 4. HaveIBeenPwned k-anonymity breach check
    is_breached = await check_haveibeenpwned_breach(payload.password)
    if is_breached:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "BREACHED_PASSWORD",
                "message": "This password has appeared in a known public data breach. Please choose a different, unique password.",
            },
        )

    # 5. Check Existing Account (Anti-Enumeration)
    stmt = select(User).where(User.email == clean_email)
    res = await db.execute(stmt)
    existing_user = res.scalar_one_or_none()

    if existing_user:
        # User already exists: send notification to existing email, run dummy hash, return identical response
        dummy_verify()
        await EmailService.send_existing_account_notification(clean_email)
        return SignupResponse()

    # 6. Create User & Token with Race Condition Protection
    password_hash = hash_password(payload.password)
    new_user = User(
        email=clean_email,
        password_hash=password_hash,
        plan="free",
        email_verified_at=None,
    )
    db.add(new_user)

    try:
        await db.flush()  # Flushes and assigns user.id or triggers IntegrityError if race occurred
    except IntegrityError:
        await db.rollback()
        # Simultaneous duplicate signup caught by DB unique constraint
        dummy_verify()
        await EmailService.send_existing_account_notification(clean_email)
        return SignupResponse()

    # 7. Generate Verification Token (256-bit CSPRNG)
    raw_token = generate_secure_token(32)
    token_hash = hash_token(raw_token)
    verify_token_entry = OneTimeToken(
        user_id=new_user.id,
        token_type="email_verify",
        token_hash=token_hash,
        expires_at=utc_now() + timedelta(hours=24),
    )
    db.add(verify_token_entry)
    await db.commit()

    # 8. Send Verification Email
    await EmailService.send_verification_email(clean_email, raw_token)

    logger.info(
        f"User signup completed successfully for user_id={new_user.id} ({mask_email(clean_email)})",
        extra={"user_id": new_user.id, "action": "signup_success"},
    )
    return SignupResponse()


@router.post("/verify-email", response_model=GenericSuccessResponse)
async def verify_email(
    payload: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Validates single-use email verification token:
    - Constant-time comparison
    - Single-use consumption
    - Expiration verification (24h)
    """
    token_hash = hash_token(payload.token)
    stmt = (
        select(OneTimeToken)
        .where(
            OneTimeToken.token_hash == token_hash,
            OneTimeToken.token_type == "email_verify",
            OneTimeToken.used_at.is_(None),
            OneTimeToken.expires_at > utc_now(),
        )
    )
    res = await db.execute(stmt)
    token_obj = res.scalar_one_or_none()

    if not token_obj:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_TOKEN", "message": "Verification token is invalid, expired, or already used."},
        )

    # Mark token used
    now = utc_now()
    token_obj.used_at = now

    # Mark user verified
    user_stmt = select(User).where(User.id == token_obj.user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one()
    user.email_verified_at = now

    await db.commit()

    logger.info(f"Email verified for user_id={user.id} ({mask_email(user.email)})")
    return GenericSuccessResponse(message="Email address verified successfully. You may now log in.")


@router.post("/resend-verification", response_model=GenericSuccessResponse)
async def resend_verification(
    payload: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Resends a verification email while preventing account enumeration."""
    try:
        clean_email = normalize_email(payload.email)
    except ValueError:
        dummy_verify()
        return GenericSuccessResponse(
            message="If an unverified account exists for this email, a verification link has been dispatched."
        )

    stmt = select(User).where(User.email == clean_email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if user and user.email_verified_at is None:
        # Invalidate old unused verification tokens
        await db.execute(
            update(OneTimeToken)
            .where(
                OneTimeToken.user_id == user.id,
                OneTimeToken.token_type == "email_verify",
                OneTimeToken.used_at.is_(None),
            )
            .values(used_at=utc_now())
        )

        raw_token = generate_secure_token(32)
        token_hash = hash_token(raw_token)
        new_token = OneTimeToken(
            user_id=user.id,
            token_type="email_verify",
            token_hash=token_hash,
            expires_at=utc_now() + timedelta(hours=24),
        )
        db.add(new_token)
        await db.commit()
        await EmailService.send_verification_email(clean_email, raw_token)
    else:
        dummy_verify()

    return GenericSuccessResponse(
        message="If an unverified account exists for this email, a verification link has been dispatched."
    )


@router.post("/login", response_model=AuthUserResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Production-grade login:
    - Generic error message and strict constant-timing parity for unknown users
    - Brute force protection (temporary 15m lockout after 5 consecutive failures)
    - Email lockout alert notification
    - Verifies email confirmation status
    - Transparent Argon2id rehash on parameter upgrades
    - Session rotation (prevents session fixation)
    - Hardened HttpOnly SameSite=Lax cookie issuance
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:500]

    # Honeypot detection
    if payload.honeypot:
        dummy_verify()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."},
        )

    try:
        clean_email = normalize_email(payload.email)
    except ValueError:
        dummy_verify()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."},
        )

    stmt = select(User).where(User.email == clean_email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        # Run dummy Argon2id verification to equalize timing with valid users
        dummy_verify()
        logger.warning(f"Failed login attempt for non-existent email from IP {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."},
        )

    now = utc_now()

    # Check account active status
    if not user.is_active:
        dummy_verify()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."},
        )

    # Check account lockout
    locked_until = ensure_utc(user.locked_until)
    if locked_until and locked_until > now:
        remaining_secs = int((locked_until - now).total_seconds())
        remaining_mins = max(1, remaining_secs // 60)
        logger.warning(f"Login attempted on locked user_id={user.id} ({mask_email(user.email)})")
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail={
                "code": "ACCOUNT_LOCKED",
                "message": f"Account temporarily locked due to consecutive failed attempts. Try again in {remaining_mins} minutes or reset your password.",
            },
        )

    # If lockout expired, reset counter
    if locked_until and locked_until <= now:
        user.locked_until = None
        user.failed_login_count = 0

    # Verify credentials
    is_valid, needs_rehash = verify_password(payload.password, user.password_hash)

    if not is_valid:
        user.failed_login_count += 1
        if user.failed_login_count >= MAX_FAILED_ATTEMPTS:
            user.locked_until = now + LOCKOUT_DURATION
            logger.warning(f"User {user.id} locked out for 15 minutes after {user.failed_login_count} failures.")
            await EmailService.send_lockout_warning_email(user.email, user.locked_until.isoformat())

        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."},
        )

    # Check email verification status
    if user.email_verified_at is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "EMAIL_NOT_VERIFIED",
                "message": "Please verify your email address before logging in. Check your inbox for the activation link.",
            },
        )

    # Reset failure tracking & update last login
    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_at = now

    # Transparent rehash if Argon2id parameters changed
    if needs_rehash:
        user.password_hash = hash_password(payload.password)

    # Create new session (Session Fixation Prevention: new token on every login)
    raw_session_token = generate_secure_token(32)
    session_hash = hash_token(raw_session_token)

    lifetime = SESSION_REMEMBER_LIFETIME if payload.remember_me else SESSION_DEFAULT_LIFETIME
    expires_at = now + lifetime

    db_session = DbSession(
        session_hash=session_hash,
        user_id=user.id,
        ip_address=client_ip,
        user_agent=user_agent,
        expires_at=expires_at,
        created_at=now,
        last_seen_at=now,
    )
    db.add(db_session)
    await db.commit()

    # Set hardened session cookie
    is_https = request.url.scheme == "https" or settings.is_production
    set_session_cookie(
        response=response,
        session_token=raw_session_token,
        max_age_seconds=int(lifetime.total_seconds()),
        is_secure=is_https,
    )

    # Set double-submit CSRF cookie
    csrf_token = generate_secure_token(24)
    set_csrf_cookie(response=response, csrf_token=csrf_token, is_secure=is_https)

    logger.info(
        f"User logged in: user_id={user.id} ({mask_email(user.email)}) from IP {client_ip}",
        extra={"user_id": user.id, "action": "login_success"},
    )

    return AuthUserResponse(
        id=user.id,
        email=user.email,
        plan=user.plan,
        email_verified=bool(user.email_verified_at),
        created_at=user.created_at,
        last_login_at=user.last_login_at,
    )


@router.post("/logout", response_model=GenericSuccessResponse)
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Server-side session invalidation and cookie clearing."""
    raw_token = extract_session_token(request)
    if raw_token:
        token_hash = hash_token(raw_token)
        await db.execute(
            update(DbSession)
            .where(DbSession.session_hash == token_hash, DbSession.revoked_at.is_(None))
            .values(revoked_at=utc_now())
        )
        await db.commit()

    is_https = request.url.scheme == "https" or settings.is_production
    clear_session_cookie(response=response, is_secure=is_https)

    return GenericSuccessResponse(message="Successfully logged out.")


@router.get("/me", response_model=AuthUserResponse)
async def get_me(
    user_and_session: tuple[User, DbSession] = Depends(get_current_user_and_session),
):
    """Fetches details of the currently authenticated user."""
    user, _ = user_and_session
    return AuthUserResponse(
        id=user.id,
        email=user.email,
        plan=user.plan,
        email_verified=bool(user.email_verified_at),
        created_at=user.created_at,
        last_login_at=user.last_login_at,
    )


@router.get("/sessions", response_model=list[SessionInfoResponse])
async def list_active_sessions(
    user_and_session: tuple[User, DbSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """Lists all active device sessions for the authenticated user."""
    user, current_session = user_and_session

    stmt = (
        select(DbSession)
        .where(
            DbSession.user_id == user.id,
            DbSession.revoked_at.is_(None),
            DbSession.expires_at > utc_now(),
        )
        .order_by(DbSession.last_seen_at.desc())
    )
    res = await db.execute(stmt)
    sessions = res.scalars().all()

    return [
        SessionInfoResponse(
            id=s.id,
            ip_address=s.ip_address,
            user_agent=s.user_agent,
            created_at=s.created_at,
            last_seen_at=s.last_seen_at,
            expires_at=s.expires_at,
            is_current=(s.id == current_session.id),
        )
        for s in sessions
    ]


@router.post("/sessions/revoke-all", response_model=GenericSuccessResponse)
async def revoke_all_sessions(
    user_and_session: tuple[User, DbSession] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """Revokes all active sessions for the user (except current session)."""
    user, current_session = user_and_session
    now = utc_now()

    await db.execute(
        update(DbSession)
        .where(
            DbSession.user_id == user.id,
            DbSession.id != current_session.id,
            DbSession.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )
    await db.commit()

    logger.info(f"User {user.id} logged out of all other sessions.")
    return GenericSuccessResponse(message="All other sessions have been successfully revoked.")


@router.post("/forgot-password", response_model=GenericSuccessResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Password reset request:
    - Constant response and timing parity whether user exists or not
    - Single-use 256-bit token with 15-minute expiration
    - Invalidates prior unused reset tokens
    """
    if payload.honeypot:
        dummy_verify()
        return GenericSuccessResponse(
            message="If an account matches that email, a password reset link has been dispatched."
        )

    try:
        clean_email = normalize_email(payload.email)
    except ValueError:
        dummy_verify()
        return GenericSuccessResponse(
            message="If an account matches that email, a password reset link has been dispatched."
        )

    stmt = select(User).where(User.email == clean_email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if user and user.is_active:
        now = utc_now()
        # Invalidate existing reset tokens
        await db.execute(
            update(OneTimeToken)
            .where(
                OneTimeToken.user_id == user.id,
                OneTimeToken.token_type == "password_reset",
                OneTimeToken.used_at.is_(None),
            )
            .values(used_at=now)
        )

        raw_token = generate_secure_token(32)
        token_hash = hash_token(raw_token)
        reset_token = OneTimeToken(
            user_id=user.id,
            token_type="password_reset",
            token_hash=token_hash,
            expires_at=now + timedelta(minutes=15),
        )
        db.add(reset_token)
        await db.commit()

        await EmailService.send_password_reset_email(clean_email, raw_token)
    else:
        dummy_verify()

    return GenericSuccessResponse(
        message="If an account matches that email, a password reset link has been dispatched."
    )


@router.post("/reset-password", response_model=GenericSuccessResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Consumes password reset token:
    - Validates token constant-time and single-use
    - Enforces NIST password rules & HIBP check
    - Revokes ALL existing active sessions for user immediately
    - Sends security confirmation email
    """
    token_hash = hash_token(payload.token)
    now = utc_now()

    stmt = (
        select(OneTimeToken)
        .where(
            OneTimeToken.token_hash == token_hash,
            OneTimeToken.token_type == "password_reset",
            OneTimeToken.used_at.is_(None),
            OneTimeToken.expires_at > now,
        )
    )
    res = await db.execute(stmt)
    token_obj = res.scalar_one_or_none()

    if not token_obj:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_RESET_TOKEN", "message": "Password reset link is invalid or has expired."},
        )

    # Fetch user
    user_stmt = select(User).where(User.id == token_obj.user_id)
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one()

    # Validate new password
    try:
        validate_nist_password(payload.new_password, user_email=user.email)
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "WEAK_PASSWORD", "message": str(err)},
        )

    is_breached = await check_haveibeenpwned_breach(payload.new_password)
    if is_breached:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "BREACHED_PASSWORD",
                "message": "This password has appeared in a known public data breach. Please choose a different, unique password.",
            },
        )

    # Update password and mark token used
    user.password_hash = hash_password(payload.new_password)
    token_obj.used_at = now

    # Revoke ALL active sessions for this user (critical security rule)
    await db.execute(
        update(DbSession)
        .where(DbSession.user_id == user.id, DbSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )

    await db.commit()

    # Clear any current session cookies
    is_https = request.url.scheme == "https" or settings.is_production
    clear_session_cookie(response=response, is_secure=is_https)

    await EmailService.send_password_changed_notification(user.email)
    logger.info(f"Password reset successful for user_id={user.id} ({mask_email(user.email)})")

    return GenericSuccessResponse(
        message="Password has been reset successfully. Please log in with your new password."
    )
