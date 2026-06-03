import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, postChat, postExplain } from '../services/api';
import type { ChatMessage, Transaction } from '../types';
import { formatFCFA } from '../utils/format';
import { useI18n } from '../i18n';

const MOCK_EXPLANATIONS: Record<string, string> = {
  Benford:
    '**Analyse Benford :** Les jeux de données financiers naturels suivent une distribution logarithmique des premiers chiffres. Cette transaction présente une déviation significative (p < 0,01), suggérant une manipulation possible.',
  Outlier:
    '**Détection d\'outlier :** Le montant dépasse 3 écarts-types de la moyenne mobile sur 90 jours pour cette catégorie.',
  Duplicate:
    '**Pattern de duplication :** Correspondance exacte sur montant, fournisseur et référence dans une fenêtre de 72 h — vecteur classique de fraude par double paiement.',
};

function buildGreeting(tx: Transaction, t: (k: string, v?: Record<string, string | number>) => string, locale: 'fr' | 'en'): ChatMessage {
  return {
    role: 'assistant',
    content: t('assistant.greeting', {
      id: tx.id,
      description: tx.description,
      amount: formatFCFA(tx.amount, locale),
      score: tx.risk_score,
      severity: t(`severity.${tx.severity}`),
    }),
  };
}

function mockResponse(tx: Transaction, message: string): ChatMessage {
  const lower = message.toLowerCase();
  let content = tx.aiExplanation ?? '';

  if (!content) {
    const rule = tx.anomalies[0]?.rule_name ?? '';
    if (/benford/i.test(rule) || lower.includes('benford')) content = MOCK_EXPLANATIONS.Benford;
    else if (/duplicate|doublon/i.test(rule) || lower.includes('duplicate'))
      content = MOCK_EXPLANATIONS.Duplicate;
    else if (/outlier/i.test(rule) || lower.includes('outlier'))
      content = MOCK_EXPLANATIONS.Outlier;
    else
      content =
        'Cette transaction présente des paramètres dans la norme attendue pour son segment. Le score agrège montant, temporalité et historique fournisseur.';
  }

  if (lower.includes('recommend') || lower.includes('action')) {
    content += `\n\n**Actions recommandées :**\n• Geler le paiement en attente de pièces\n• Demander factures et chaîne d'approbation\n• Escalader si score ≥ 70`;
  }

  return { role: 'assistant', content };
}

export function useChat(transaction: Transaction | null, hasAnalyzed: boolean) {
  const { t, locale } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastTxId = useRef<string | null>(null);

  useEffect(() => {
    if (!transaction || !hasAnalyzed) {
      setMessages([]);
      lastTxId.current = null;
      return;
    }
    if (transaction.id !== lastTxId.current) {
      lastTxId.current = transaction.id;
      setError(null);
      setMessages([buildGreeting(transaction, t, locale)]);

      postExplain(transaction.id)
        .then(({ explanation }) => {
          if (explanation) {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: explanation },
            ]);
          }
        })
        .catch((err: ApiError) => {
          if (err.status !== 400 && transaction.aiExplanation) {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: transaction.aiExplanation! },
            ]);
          }
        });
    }
  }, [transaction, hasAnalyzed, t, locale]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!transaction || !text.trim() || !hasAnalyzed) return;

      const userMsg: ChatMessage = { role: 'user', content: text.trim() };
      const history = [...messages, userMsg];
      setMessages(history);
      setLoading(true);
      setError(null);

      try {
        const { response } = await postChat(transaction.id, text.trim(), messages);
        setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
      } catch (err) {
        if (err instanceof ApiError && err.status === 400) {
          setError(t('dashboard.analyzeRequired'));
        } else {
          await new Promise((r) => setTimeout(r, 400));
          setMessages((prev) => [...prev, mockResponse(transaction, text)]);
        }
      } finally {
        setLoading(false);
      }
    },
    [transaction, hasAnalyzed, messages, t],
  );

  return { messages, loading, error, sendMessage };
}
