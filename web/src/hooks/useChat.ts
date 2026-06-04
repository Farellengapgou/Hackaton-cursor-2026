import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchLlmStatus, postChat, postExplain, type LlmStatus } from '../services/api';
import type { ChatMessage, Transaction } from '../types';
import { formatFCFA } from '../utils/format';
import { useI18n } from '../i18n';

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

function sourceLabel(
  source: string,
  llmStatus: LlmStatus | null,
  t: (key: string) => string,
): string {
  if (source === 'llm') return t('assistant.sourceLlm');
  if (llmStatus?.configured === false) return t('assistant.sourceRulesMissing');
  return t('assistant.sourceRules');
}

function appendSourceNote(
  content: string,
  source: string,
  llmStatus: LlmStatus | null,
  t: (key: string) => string,
): string {
  if (source === 'llm') return content;
  const note = `\n\n— *${sourceLabel(source, llmStatus, t)}*`;
  if (content.includes(t('assistant.sourceRules'))) return content;
  return content + note;
}

function fallbackFromTransaction(tx: Transaction, t: (key: string) => string): string {
  if (tx.aiExplanation) return tx.aiExplanation;
  if (tx.anomalies.length === 0) {
    return t('assistant.noSignals');
  }
  return tx.anomalies.map((a) => `**${a.rule_name}** : ${a.reason}`).join('\n\n');
}

export function useChat(transaction: Transaction | null, hasAnalyzed: boolean) {
  const { t, locale } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [llmStatus, setLlmStatus] = useState<LlmStatus | null>(null);
  const lastTxId = useRef<string | null>(null);

  useEffect(() => {
    fetchLlmStatus().then(setLlmStatus);
  }, []);

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
        .then(({ explanation, source }) => {
          if (explanation) {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: appendSourceNote(explanation, source, llmStatus, t),
              },
            ]);
          }
        })
        .catch((err: ApiError) => {
          if (err.status === 400) {
            setError(t('dashboard.analyzeRequired'));
            return;
          }
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: fallbackFromTransaction(transaction, t) },
          ]);
        });
    }
  }, [transaction, hasAnalyzed, t, locale, llmStatus]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!transaction || !text.trim() || !hasAnalyzed) return;

      const userMsg: ChatMessage = { role: 'user', content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setError(null);

      try {
        const { response, source } = await postChat(transaction.id, text.trim(), messages);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: appendSourceNote(response, source, llmStatus, t) },
        ]);
      } catch (err) {
        if (err instanceof ApiError && err.status === 400) {
          setError(t('dashboard.analyzeRequired'));
        } else {
          const status = llmStatus ?? (await fetchLlmStatus());
          setLlmStatus(status);
          setError(
            status.configured ? t('assistant.backendUnreachable') : t('assistant.geminiNotConfigured'),
          );
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: appendSourceNote(fallbackFromTransaction(transaction, t), 'template', status, t),
            },
          ]);
        }
      } finally {
        setLoading(false);
      }
    },
    [transaction, hasAnalyzed, messages, t, llmStatus],
  );

  return { messages, loading, error, sendMessage, llmStatus };
}
