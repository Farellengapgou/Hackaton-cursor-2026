"""Point d'entrée de l'API FinAudit : fabrique d'application et CORS.

La logique métier vit dans les modules ``detection``, ``ai``, ``services`` et
``schemas`` ; ce fichier se contente d'assembler l'application et d'enregistrer
les routeurs.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes_chat import router as chat_router
from api.routes_health import router as health_router
from api.routes_transactions import router as transactions_router
from api.routes_upload import router as upload_router
from config import settings


def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_TITLE)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.CORS_ORIGIN],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(upload_router)
    app.include_router(transactions_router)
    app.include_router(chat_router)

    return app


app = create_app()
