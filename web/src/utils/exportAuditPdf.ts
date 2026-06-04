import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AuditSummary, Transaction } from '../types';
import { getAnomalyRuleInfo } from './anomalyLabels';

export type PdfOrientation = 'portrait' | 'landscape';

function riskVerdict(score: number): string {
  if (score >= 70) {
    return 'RISQUE ÉLEVÉ : revue prioritaire des paiements et pièces justificatives.';
  }
  if (score >= 40) {
    return 'RISQUE MODÉRÉ : contrôles ciblés recommandés sous 48 h.';
  }
  return 'RISQUE MAÎTRISÉ : peu de signaux forts, contrôles habituels suffisants.';
}

function actionForTx(tx: Transaction): string {
  if (tx.aiExplanation) return tx.aiExplanation.slice(0, 200);
  if (tx.risk_score >= 70) return 'Suspendre le paiement jusqu\'à validation DAF et justificatifs.';
  if (tx.risk_score >= 40) return 'Demander facture et validation hiérarchique sous 48 h.';
  return 'Contrôle ponctuel recommandé.';
}

export function exportAuditPdf(
  transactions: Transaction[],
  summary: AuditSummary,
  orientation: PdfOrientation = 'portrait',
): void {
  const flagged = transactions
    .filter((t) => t.anomalies.length > 0)
    .sort((a, b) => b.risk_score - a.risk_score);

  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(orientation === 'landscape' ? 16 : 18);
  doc.setTextColor(15, 32, 39);
  doc.text('FinAudit — Rapport d\'audit financier', pageW / 2, y, { align: 'center' });
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Confidentiel — ${new Date().toLocaleString('fr-FR')} — Lecture DAF / auditeur`,
    pageW / 2,
    y,
    { align: 'center' },
  );
  y += 12;
  doc.setDrawColor(29, 158, 117);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 32, 39);
  doc.text('1. Conclusion', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const conclusion = [
    riskVerdict(summary.globalRiskScore),
    `${summary.totalTransactions} transactions analysées, ${summary.anomalyCount} avec signaux, ${summary.criticalCount} critiques.`,
    `Score global : ${summary.globalRiskScore}/100 — Montant total : ${summary.totalAmount.toLocaleString('fr-FR')} FCFA`,
  ];
  conclusion.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, pageW - 2 * margin);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 5;
  });
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('2. Signaux par type (signification)', margin, y);
  y += 2;
  const ruleCounts: Record<string, number> = {};
  flagged.forEach((t) => {
    t.anomalies.forEach((a) => {
      ruleCounts[a.rule_name] = (ruleCounts[a.rule_name] ?? 0) + 1;
    });
  });
  const breakdownRows = Object.entries(ruleCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([ruleId, count]) => {
      const info = getAnomalyRuleInfo(ruleId);
      return [info.label, String(count), info.description.slice(0, 90)];
    });

  const tableLineColor: [number, number, number] = [160, 175, 185];
  const tableCommon = {
    margin: { left: margin, right: margin },
    theme: 'grid' as const,
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      overflow: 'linebreak' as const,
      lineColor: tableLineColor,
      lineWidth: 0.25,
      textColor: [15, 32, 39] as [number, number, number],
    },
    headStyles: {
      fillColor: [15, 32, 39] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      lineColor: [15, 32, 39] as [number, number, number],
      lineWidth: 0.3,
      fontStyle: 'bold' as const,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
  };

  autoTable(doc, {
    startY: y + 2,
    head: [['Signal', 'Nb', 'Signification']],
    body: breakdownRows.length ? breakdownRows : [['—', '0', 'Aucun signal']],
    ...tableCommon,
    columnStyles: { 2: { cellWidth: orientation === 'landscape' ? 90 : 70 } },
  });
  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. Transactions prioritaires', margin, y);
  y += 4;

  const detailRows = flagged.map((tx) => {
    const signals = tx.anomalies
      .map((a) => getAnomalyRuleInfo(a.rule_name).label)
      .join(', ');
    return [
      tx.id,
      tx.description.slice(0, 35),
      `${tx.amount.toLocaleString('fr-FR')} FCFA`,
      String(tx.risk_score),
      tx.severity,
      signals,
      actionForTx(tx),
    ];
  });

  autoTable(doc, {
    startY: y + 2,
    head: [['ID', 'Libellé', 'Montant', 'Score', 'Sév.', 'Signaux', 'Action / explication']],
    body: detailRows.length ? detailRows : [['—', 'RAS', '', '', '', '', '']],
    ...tableCommon,
    styles: { ...tableCommon.styles, fontSize: 7 },
    columnStyles: { 6: { cellWidth: orientation === 'landscape' ? 75 : 50 } },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 140);
    doc.text(`FinAudit — Page ${i}/${pageCount}`, pageW / 2, doc.internal.pageSize.getHeight() - 8, {
      align: 'center',
    });
  }

  doc.save(`FinAudit_Rapport_${new Date().toISOString().slice(0, 10)}.pdf`);
}
