/** Libellés et explications métier pour les règles de détection (affichage graphiques / tooltips). */

export type AnomalyRuleInfo = {
  label: string;
  description: string;
};

const RULES: Record<string, AnomalyRuleInfo> = {
  OUTLIER_STATISTIQUE: {
    label: 'Montant inhabituel',
    description:
      'Montant anormalement élevé ou bas par rapport à la moyenne et à la dispersion des autres transactions du fichier.',
  },
  DOUBLON: {
    label: 'Doublon',
    description:
      'Même montant, même libellé/fournisseur et date proche qu\'une autre ligne — risque de double paiement.',
  },
  MONTANT_NEGATIF: {
    label: 'Montant négatif',
    description: 'Écriture avec montant négatif : à vérifier (avoir, correction ou erreur de saisie).',
  },
  HEURE_NOCTURNE: {
    label: 'Heure atypique',
    description:
      'Transaction en dehors des heures ouvrables habituelles (soir, nuit ou week-end selon le contexte).',
  },
  MONTANT_ROND: {
    label: 'Montant rond suspect',
    description:
      'Montant « rond » (ex. multiples de 50 000 ou 1 000 000 FCFA) parfois associé à des paiements non documentés.',
  },
  FOURNISSEUR_UNIQUE: {
    label: 'Fournisseur unique',
    description:
      'Ce bénéficiaire n\'apparaît qu\'une seule fois dans le fichier : vigilance renforcée, pas une preuve de fraude.',
  },
  ISOLATION_FOREST: {
    label: 'Profil atypique (ML)',
    description:
      'Score multivarié : montant, heure, jour et catégorie s\'écartent du profil « normal » des autres lignes (algorithme Isolation Forest). À recouper avec les autres signaux.',
  },
  BENFORD_DEVIATION: {
    label: 'Loi de Benford',
    description:
      'La distribution des premiers chiffres des montants du fichier s\'écarte de la loi de Benford — signal au niveau du jeu de données, pas d\'une ligne seule.',
  },
  Benford: {
    label: 'Loi de Benford',
    description: 'Écart statistique sur les premiers chiffres des montants (test global du fichier).',
  },
  Outlier: {
    label: 'Montant inhabituel',
    description: 'Montant statistiquement aberrant par rapport au reste des transactions.',
  },
  Duplicate: {
    label: 'Doublon',
    description: 'Risque de paiement en double sur la même période.',
  },
};

export function getAnomalyRuleInfo(ruleName: string): AnomalyRuleInfo {
  const key = ruleName?.trim() || '';
  if (RULES[key]) return RULES[key];
  const normalized = key.replace(/\s+/g, '_').toUpperCase();
  if (RULES[normalized]) return RULES[normalized];
  return {
    label: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
    description: `Signal de détection « ${key} » — consultez le détail de la transaction pour le motif exact.`,
  };
}

export function mapDistributionForChart(
  data: { name: string; count: number }[],
): { name: string; count: number; ruleId: string; label: string; description: string }[] {
  return data.map((d) => {
    const info = getAnomalyRuleInfo(d.name);
    return {
      ...d,
      ruleId: d.name,
      name: info.label,
      label: info.label,
      description: info.description,
    };
  });
}
