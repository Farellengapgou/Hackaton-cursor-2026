import { useEffect, useState } from 'react';
import { postExplain } from '../../services/api';
import SeverityBadge from '../shared/SeverityBadge';
import RiskGauge from '../shared/RiskGauge';
import { getSeverityBgTailwind } from '../../styles/theme';
import { formatDateTime, formatFCFA } from '../../utils/format';
import { useI18n } from '../../i18n';
import { useTransactions } from '../../hooks/useTransactions';
import type { Transaction } from '../../types';

interface TransactionDetailPanelProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export default function TransactionDetailPanel({
  transaction,
  onClose,
}: TransactionDetailPanelProps) {
  const { t, locale } = useI18n();
  const { hasAnalyzed, openAssistantFor } = useTransactions();
  const [explanation, setExplanation] = useState<string | null>(null);

  useEffect(() => {
    if (!transaction || !hasAnalyzed) {
      setExplanation(null);
      return;
    }
    setExplanation(transaction.aiExplanation ?? null);
    postExplain(transaction.id)
      .then(({ explanation: exp }) => setExplanation(exp))
      .catch(() => {
        const local =
          transaction.aiExplanation ??
          (transaction.anomalies.length > 0
            ? transaction.anomalies
                .map((a) => `${a.rule_name} : ${a.reason}`)
                .join('\n')
            : 'Transaction sans signal — contrôle standard.');
        setExplanation(local);
      });
  }, [transaction, hasAnalyzed]);

  if (!transaction) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} aria-hidden />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-themed bg-themed-light shadow-panel animate-slide-up">
        <div className="flex items-center justify-between border-b border-themed px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">{t('transactions.detail')}</p>
            <p className="font-mono text-sm font-bold text-themed-fg">{transaction.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted transition hover:bg-themed-hover hover:text-themed-fg"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="flex justify-center py-4">
            <RiskGauge score={transaction.risk_score} size={140} label={t('transactions.columns.riskScore')} />
          </div>

          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="text-xs uppercase text-muted">{t('transactions.columns.description')}</dt>
              <dd className="mt-1 text-themed-fg">{transaction.description}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted">{t('transactions.columns.amount')}</dt>
              <dd className="mt-1 font-mono text-lg text-themed-fg">
                {formatFCFA(transaction.amount, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted">{t('transactions.columns.date')}</dt>
              <dd className="mt-1 font-mono text-themed-fg/80">
                {formatDateTime(transaction.date, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted">{t('transactions.columns.severity')}</dt>
              <dd className="mt-2">
                <SeverityBadge severity={transaction.severity} size="md" />
              </dd>
            </div>
          </dl>

          {transaction.anomalies.length > 0 && (
            <div className={`mt-6 rounded-lg border p-4 ${getSeverityBgTailwind(transaction.severity)}`}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t('transactions.flags')}</p>
              <ul className="mt-2 space-y-3">
                {transaction.anomalies.map((a, i) => (
                  <li key={i} className="text-sm">
                    <p className="font-medium text-themed-fg">{a.rule_name}</p>
                    <p className="text-themed-fg/75">{a.reason}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted">+{a.score_contribution} pts</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {explanation && (
            <div className="mt-6 rounded-lg border border-primary/30 bg-primary/10 p-4">
              <p className="text-xs font-semibold uppercase text-primary">{t('transactions.forensicNote')}</p>
              <p className="mt-2 text-sm leading-relaxed text-themed-fg/85">{explanation}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              openAssistantFor(transaction.id);
              onClose();
            }}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-themed bg-themed-panel px-4 py-3 text-sm font-semibold text-themed-fg transition hover:border-primary/50 hover:text-primary"
          >
            {t('transactions.askAssistant')}
          </button>
        </div>
      </aside>
    </>
  );
}
