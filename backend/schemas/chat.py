"""Schémas Pydantic pour l'endpoint de chat/explication."""

from __future__ import annotations

from pydantic import BaseModel


class ChatRequest(BaseModel):
    anomaly_id: str
    question: str | None = None


class ChatResponse(BaseModel):
    reply: str
