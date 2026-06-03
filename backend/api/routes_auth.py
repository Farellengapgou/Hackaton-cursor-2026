"""Routes d'authentification : inscription, connexion, profil, déconnexion."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from auth import service
from auth.dependencies import get_current_user, get_token
from schemas.auth import (
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    MeResponse,
    RegisterRequest,
    RegisterResponse,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse)
def register(body: RegisterRequest) -> dict[str, Any]:
    return service.register(body.username, body.password)


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest) -> dict[str, Any]:
    return service.login(body.username, body.password)


@router.get("/me", response_model=MeResponse)
def me(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return current_user


@router.post("/logout", response_model=LogoutResponse)
def logout(token: str = Depends(get_token)) -> dict[str, str]:
    return service.logout(token)
