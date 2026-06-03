"""Primitives partagées du module de détection d'anomalies."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


@dataclass
class Anomaly:
    """Anomalie détectée sur une transaction.

    La forme sérialisée de cet objet est figée par le contrat d'API
    (clés ``id``, ``transaction_id``, ``type``, ``severity``, ``message``,
    ``details``) et ne doit pas changer.
    """

    id: str
    transaction_id: str
    type: str
    severity: str
    message: str
    details: dict[str, Any]


class Detector(Protocol):
    """Interface d'un détecteur d'anomalies.

    Le pipeline applique les détecteurs transaction par transaction afin de
    conserver exactement l'ordre des anomalies attendu par le contrat d'API
    (pour chaque transaction : montant élevé, puis doublon, puis négatif).

    - :meth:`prepare` reçoit l'ensemble des transactions et peut précalculer
      des statistiques globales (ex. seuil) ou initialiser un état partagé,
      stocké dans ``context``.
    - :meth:`inspect` est appelée pour chaque transaction et renvoie les
      anomalies détectées sur celle-ci.
    """

    def prepare(self, transactions: list[dict[str, Any]], context: dict[str, Any]) -> None:
        ...

    def inspect(self, transaction: dict[str, Any], context: dict[str, Any]) -> list[Anomaly]:
        ...
