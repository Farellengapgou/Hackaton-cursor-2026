"""Route d'upload et d'analyse d'un relevé CSV."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile

from services.analysis_service import analyze_upload

router = APIRouter()


@router.post("/api/upload")
async def upload(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nom de fichier requis")
    lower = file.filename.lower()
    if not lower.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Formats : .csv, .xlsx, .xls")
    content = await file.read()
    return analyze_upload(content, file.filename)
