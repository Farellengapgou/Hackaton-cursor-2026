import html
import os
import tempfile
from datetime import datetime
from typing import List, Optional

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

load_dotenv()

app = FastAPI(title="FinAudit AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Transaction(BaseModel):
    id: Optional[str] = None
    montant: Optional[float] = None
    fournisseur: Optional[str] = None
    score_risque: Optional[float] = None
    heure: Optional[str] = None
    anomalies: Optional[List[str]] = None


class ChatRequest(BaseModel):
    message: str
    transaction: Optional[Transaction] = None


class AnomalyItem(BaseModel):
    id: str
    montant: float
    fournisseur: str
    score_risque: float
    explication_ia: str


class ReportRequest(BaseModel):
    total_transactions: int
    total_anomalies: int
    score_moyen: float
    anomalies: List[AnomalyItem]


DARK_GREEN = colors.HexColor("#1B5E3B")
LIGHT_GREEN = colors.HexColor("#E8F5E9")
CARD_BG = colors.HexColor("#FAFAFA")
CARD_BORDER = colors.HexColor("#E0E0E0")
MUTED_GRAY = colors.HexColor("#757575")
RED_BADGE = "#C62828"
ORANGE_BADGE = "#EF6C00"


def format_montant(montant: Optional[float]) -> str:
    if montant is None:
        return "non renseigné"
    return f"{montant:,.0f}".replace(",", " ")


def build_system_prompt(transaction: Optional[Transaction]) -> str:
    if transaction is None:
        context = "Aucune transaction sélectionnée."
    else:
        anomalies = transaction.anomalies or []
        anomalies_text = (
            "\n".join(f"  - {a}" for a in anomalies)
            if anomalies
            else "  - Aucune anomalie signalée"
        )
        context = f"""Contexte de la transaction en cours d'analyse :
- Identifiant : {transaction.id or "N/A"}
- Montant : {format_montant(transaction.montant)} FCFA
- Fournisseur : {transaction.fournisseur or "N/A"}
- Score de risque : {transaction.score_risque if transaction.score_risque is not None else "N/A"} / 100
- Heure de la transaction : {transaction.heure or "N/A"}
- Anomalies détectées :
{anomalies_text}"""

    return f"""Tu es FinAudit AI, un expert en audit financier et détection de fraude pour les PME d'Afrique centrale.

{context}

Instructions :
- Réponds toujours en français.
- Adopte le ton d'un auditeur financier expérimenté, clair et professionnel.
- Contextualise tes analyses pour l'Afrique centrale : devise FCFA (Franc CFA), fuseau GMT+1, calendriers de paie locaux (fin de mois, primes trimestrielles), pratiques de paiement mobile (Orange Money, MTN MoMo, virements bancaires UEMOA/CEMAC).
- Structure tes réponses avec des puces ou des sections lorsque c'est pertinent.
- Sois concis mais actionnable ; cite les éléments de la transaction fournie.
- Si le score de risque est supérieur à 70, termine TOUJOURS ta réponse par une recommandation concrète et prioritaire (action immédiate à entreprendre).
- Ne invente pas de données absentes du contexte ; indique les limites si une information manque."""


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat")
async def chat(request: ChatRequest):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or api_key == "your_key_here":
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY non configurée. Copiez backend/.env.example vers backend/.env.",
        )

    client = anthropic.Anthropic(api_key=api_key)
    system_prompt = build_system_prompt(request.transaction)

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            system=system_prompt,
            messages=[{"role": "user", "content": request.message}],
        )
    except anthropic.APIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    text_blocks = [
        block.text for block in response.content if block.type == "text"
    ]
    assistant_text = "\n".join(text_blocks).strip()

    return {"response": assistant_text}


def _build_pdf_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "FinAuditTitle",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=22,
            textColor=DARK_GREEN,
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "FinAuditSubtitle",
            parent=base["Normal"],
            fontSize=12,
            textColor=colors.HexColor("#424242"),
            alignment=TA_CENTER,
            spaceAfter=6,
        ),
        "date_line": ParagraphStyle(
            "FinAuditDate",
            parent=base["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#616161"),
            alignment=TA_CENTER,
            spaceAfter=14,
        ),
        "section_heading": ParagraphStyle(
            "SectionHeading",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=14,
            textColor=DARK_GREEN,
            spaceBefore=12,
            spaceAfter=10,
        ),
        "card_id": ParagraphStyle(
            "CardId",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
        ),
        "card_meta": ParagraphStyle(
            "CardMeta",
            parent=base["Normal"],
            fontSize=9,
            textColor=MUTED_GRAY,
            leading=12,
            spaceBefore=2,
        ),
        "card_ai": ParagraphStyle(
            "CardAI",
            parent=base["Normal"],
            fontSize=10,
            leading=14,
            spaceBefore=4,
        ),
    }


def build_report_pdf(path: str, report: ReportRequest) -> None:
    styles = _build_pdf_styles()
    now = datetime.now()
    date_label = now.strftime("Généré le %d/%m/%Y à %H:%M")

    doc = SimpleDocTemplate(
        path,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )
    content_width = doc.width
    story: list = []

    story.append(Spacer(1, 24))
    story.append(Paragraph("FinAudit AI", styles["title"]))
    story.append(Paragraph("Rapport d'analyse des transactions", styles["subtitle"]))
    story.append(Paragraph(date_label, styles["date_line"]))
    story.append(
        HRFlowable(
            width="100%",
            thickness=1.5,
            color=DARK_GREEN,
            spaceBefore=4,
            spaceAfter=20,
        )
    )

    story.append(Paragraph("Synthèse exécutive", styles["section_heading"]))

    summary_data = [
        [
            Paragraph(
                "<b>Transactions analysées</b>",
                ParagraphStyle(
                    "Hdr",
                    fontName="Helvetica-Bold",
                    fontSize=10,
                    textColor=colors.white,
                    alignment=TA_CENTER,
                ),
            ),
            Paragraph(
                "<b>Anomalies détectées</b>",
                ParagraphStyle(
                    "Hdr2",
                    fontName="Helvetica-Bold",
                    fontSize=10,
                    textColor=colors.white,
                    alignment=TA_CENTER,
                ),
            ),
            Paragraph(
                "<b>Score de risque moyen</b>",
                ParagraphStyle(
                    "Hdr3",
                    fontName="Helvetica-Bold",
                    fontSize=10,
                    textColor=colors.white,
                    alignment=TA_CENTER,
                ),
            ),
        ],
        [
            Paragraph(
                f"<b>{report.total_transactions}</b>",
                ParagraphStyle(
                    "Val",
                    fontName="Helvetica-Bold",
                    fontSize=18,
                    alignment=TA_CENTER,
                ),
            ),
            Paragraph(
                f"<b>{report.total_anomalies}</b>",
                ParagraphStyle(
                    "Val2",
                    fontName="Helvetica-Bold",
                    fontSize=18,
                    alignment=TA_CENTER,
                ),
            ),
            Paragraph(
                f"<b>{report.score_moyen:.0f}</b>",
                ParagraphStyle(
                    "Val3",
                    fontName="Helvetica-Bold",
                    fontSize=18,
                    alignment=TA_CENTER,
                ),
            ),
        ],
    ]
    col_w = content_width / 3
    summary_table = Table(summary_data, colWidths=[col_w, col_w, col_w])
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), DARK_GREEN),
                ("BACKGROUND", (0, 1), (-1, 1), LIGHT_GREEN),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("BOX", (0, 0), (-1, -1), 0.5, DARK_GREEN),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, DARK_GREEN),
            ]
        )
    )
    story.append(summary_table)
    story.append(Spacer(1, 16))

    story.append(Paragraph("Détail des anomalies", styles["section_heading"]))

    for anomaly in report.anomalies:
        badge_color = RED_BADGE if anomaly.score_risque >= 70 else ORANGE_BADGE
        header_html = (
            f'<font name="Helvetica-Bold">{anomaly.id}</font>'
            f' &nbsp;&nbsp; '
            f'<font color="{badge_color}"><b>{anomaly.score_risque:.0f}%</b></font>'
        )
        fournisseur_safe = html.escape(anomaly.fournisseur)
        explication_safe = html.escape(anomaly.explication_ia)
        meta_html = (
            f"{format_montant(anomaly.montant)} FCFA"
            f" &nbsp;·&nbsp; {fournisseur_safe}"
        )
        ai_html = f"<b>Analyse IA :</b> <i>{explication_safe}</i>"

        card_inner = [
            [Paragraph(header_html, styles["card_id"])],
            [Paragraph(meta_html, styles["card_meta"])],
            [Paragraph(ai_html, styles["card_ai"])],
        ]
        card_table = Table(card_inner, colWidths=[content_width - 16])
        card_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), CARD_BG),
                    ("BOX", (0, 0), (-1, -1), 0.5, CARD_BORDER),
                    ("LEFTPADDING", (0, 0), (-1, -1), 12),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )
        story.append(card_table)
        story.append(Spacer(1, 8))

    doc.build(story)


@app.post("/generate-report")
def generate_report(request: ReportRequest):
    filename = f"FinAudit_Rapport_{datetime.now().strftime('%Y%m%d')}.pdf"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp_path = tmp.name
    tmp.close()

    try:
        build_report_pdf(tmp_path, request)
    except Exception as exc:
        os.unlink(tmp_path)
        raise HTTPException(
            status_code=500,
            detail=f"Échec de la génération du PDF : {exc}",
        ) from exc

    return FileResponse(
        tmp_path,
        media_type="application/pdf",
        filename=filename,
    )
