"""
Authentication and Cryptographic Security Module for MedTree X.
Implements:
- PBKDF2-HMAC-SHA256 password hashing with salt and constant-time verification.
- RFC 7519 Compliant HMAC-SHA256 JWT token generation and verification.
- Role-based authorization dependencies.
- Strict server-side patient record isolation.
"""

import os
import hmac
import hashlib
import base64
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from fastapi import Depends, HTTPException, status, Header, Query
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

# Configuration
JWT_SECRET_KEY = os.getenv("MEDTREE_JWT_SECRET", "medtree-x-cryptographic-signing-key-2026-btech-dsa")
JWT_ALGORITHM = "HS256"
DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours for demonstration


def _base64url_encode(data: bytes) -> str:
    """Encodes bytes to standard RFC 7515 Base64URL string without padding."""
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')


def _base64url_decode(data_str: str) -> bytes:
    """Decodes standard Base64URL string, automatically restoring padding."""
    rem = len(data_str) % 4
    if rem > 0:
        data_str += '=' * (4 - rem)
    return base64.urlsafe_b64decode(data_str.encode('ascii'))


def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2-HMAC-SHA256 with 100,000 rounds and a 16-byte random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100_000
    )
    return f"pbkdf2_sha256$100000${salt}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a password against the stored PBKDF2-HMAC-SHA256 hash using constant-time comparison."""
    if not hashed_password or not hashed_password.startswith("pbkdf2_sha256$"):
        return False
    try:
        parts = hashed_password.split("$")
        if len(parts) != 4:
            return False
        iterations = int(parts[1])
        salt = parts[2]
        expected_hex = parts[3]
        candidate_key = hashlib.pbkdf2_hmac(
            'sha256',
            plain_password.encode('utf-8'),
            salt.encode('utf-8'),
            iterations
        )
        return hmac.compare_digest(candidate_key.hex(), expected_hex)
    except Exception:
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Creates an RFC 7519 HMAC-SHA256 JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp())
    })

    header = {"alg": JWT_ALGORITHM, "typ": "JWT"}
    header_json = json.dumps(header, separators=(',', ':'), sort_keys=True).encode('utf-8')
    payload_json = json.dumps(to_encode, separators=(',', ':'), sort_keys=True).encode('utf-8')

    header_b64 = _base64url_encode(header_json)
    payload_b64 = _base64url_encode(payload_json)

    signing_input = f"{header_b64}.{payload_b64}".encode('ascii')
    signature = hmac.new(JWT_SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
    signature_b64 = _base64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates an RFC 7519 JWT token."""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header_b64, payload_b64, signature_b64 = parts

        # Verify signature
        signing_input = f"{header_b64}.{payload_b64}".encode('ascii')
        expected_sig = hmac.new(JWT_SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
        actual_sig = _base64url_decode(signature_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        # Verify payload and expiration
        payload_bytes = _base64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))

        now_ts = int(datetime.now(timezone.utc).timestamp())
        if payload.get("exp") and now_ts > payload["exp"]:
            return None  # Expired

        return payload
    except Exception:
        return None


def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    token_query: Optional[str] = Query(None, alias="token"),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Retrieves current user if authenticated, without throwing if unauthenticated."""
    raw_token = None
    if authorization and authorization.startswith("Bearer "):
        raw_token = authorization.split(" ")[1]
    elif token_query:
        raw_token = token_query

    if not raw_token:
        return None

    payload = decode_access_token(raw_token)
    if not payload or "sub" not in payload:
        return None

    user = db.query(User).filter(User.username == payload["sub"]).first()
    return user


def get_current_user(
    authorization: Optional[str] = Header(None),
    token_query: Optional[str] = Query(None, alias="token"),
    db: Session = Depends(get_db)
) -> User:
    """Enforces authentication and returns current User instance."""
    user = get_current_user_optional(authorization, token_query, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials missing, invalid, or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_role(allowed_roles: List[str]):
    """Returns a dependency requiring the user to possess one of the allowed roles."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: User role '{current_user.role}' lacks permission for this resource."
            )
        return current_user
    return role_checker


def verify_patient_access(current_user: User, patient_id: str) -> None:
    """
    Enforces strict server-side patient record isolation:
    Patients can only ever query or modify their own patient ID.
    Staff roles (doctor, receptionist, nurse, admin) have clinical/operational access.
    """
    if current_user.role == "patient":
        if current_user.patient_id != patient_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are only authorized to access your own patient health record."
            )
