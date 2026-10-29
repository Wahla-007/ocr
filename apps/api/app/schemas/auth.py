"""Pydantic schemas for authentication and session management."""

from datetime import datetime

from pydantic import BaseModel, Field


class SignupRequest(BaseModel):
    email: str = Field(..., max_length=254, description="User email address")
    password: str = Field(
        ..., min_length=12, max_length=128, description="Password meeting NIST standards"
    )
    honeypot: str | None = Field(
        None, max_length=100, description="Honeypot field for bot trapping"
    )


class SignupResponse(BaseModel):
    status: str = "success"
    message: str = "If your email is valid and unregistered, a verification link has been dispatched to your inbox."


class LoginRequest(BaseModel):
    email: str = Field(..., max_length=254)
    password: str = Field(..., min_length=1, max_length=128)
    remember_me: bool = Field(False, description="Extend session lifetime up to 14 days")
    honeypot: str | None = Field(None, max_length=100)


class AuthUserResponse(BaseModel):
    id: str
    email: str
    plan: str
    email_verified: bool
    created_at: datetime
    last_login_at: datetime | None = None


class SessionInfoResponse(BaseModel):
    id: str
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime
    last_seen_at: datetime
    expires_at: datetime
    is_current: bool = False


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=256)


class ResendVerificationRequest(BaseModel):
    email: str = Field(..., max_length=254)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., max_length=254)
    honeypot: str | None = Field(None, max_length=100)


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=256)
    new_password: str = Field(..., min_length=12, max_length=128)


class GenericSuccessResponse(BaseModel):
    status: str = "success"
    message: str
