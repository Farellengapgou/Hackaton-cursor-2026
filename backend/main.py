import os
from typing import List, Optional

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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
