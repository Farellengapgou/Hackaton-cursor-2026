"""Schémas Pydantic pour l'authentification."""

from __future__ import annotations

from pydantic import BaseModel


class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterResponse(BaseModel):
    user_id: str
    username: str
    message: str


class LoginResponse(BaseModel):
    access_token: str
    user_id: str
    username: str


class MeResponse(BaseModel):
    user_id: str
    username: str


class LogoutResponse(BaseModel):
    status: str
