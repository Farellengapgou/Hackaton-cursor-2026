/** Libellés et explications métier pour les règles de détection (i18n). */

export type AnomalyRuleInfo = {
  label: string;
  description: string;
};

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

const KNOWN_IDS = [
  'OUTLIER_STATISTIQUE',
  'DOUBLON',
  'MONTANT_NEGATIF',
  'HEURE_NOCTURNE',
  'MONTANT_ROND',
  'FOURNISSEUR_UNIQUE',
  'ISOLATION_FOREST',
  'BENFORD_DEVIATION',
  'BENFORD',
  'OUTLIER',
  'DUPLICATE',
] as const;

function resolveRuleId(ruleName: string): string {
  const key = ruleName?.trim() || '';
  if ((KNOWN_IDS as readonly string[]).includes(key)) return key;
  const normalized = key.replace(/\s+/g, '_').toUpperCase();
  if ((KNOWN_IDS as readonly string[]).includes(normalized)) return normalized;
  if (key === 'Benford') return 'BENFORD';
  if (key === 'Outlier') return 'OUTLIER';
  if (key === 'Duplicate') return 'DUPLICATE';
  return normalized || key;
}

export function getAnomalyRuleInfo(ruleName: string, t: TranslateFn): AnomalyRuleInfo {
  const id = resolveRuleId(ruleName);
  const labelKey = `rules.${id}.label`;
  const label = t(labelKey);
  if (label !== labelKey) {
    return {
      label,
      description: t(`rules.${id}.description`),
    };
  }
  const display =
    ruleName?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) || id;
  return {
    label: display,
    description: t('rules.fallback.description', { rule: ruleName || id }),
  };
}

export function mapDistributionForChart(
  data: { name: string; count: number }[],
  t: TranslateFn,
): { name: string; count: number; ruleId: string; label: string; description: string }[] {
  return data.map((d) => {
    const info = getAnomalyRuleInfo(d.name, t);
    return {
      ...d,
      ruleId: d.name,
      name: info.label,
      label: info.label,
      description: info.description,
    };
  });
}
