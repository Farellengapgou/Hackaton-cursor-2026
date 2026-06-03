import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChat } from '../../hooks/useChat';
import { useTransactions } from '../../hooks/useTransactions';
import { useI18n } from '../../i18n';

interface AssistantPanelProps {
  onClose: () => void;
}

export default function AssistantPanel({ onClose }: AssistantPanelProps) {
  const { t } = useI18n();
  const {
    transactions,
    selectedTransaction,
    setSelectedTransaction,
    hasAnalyzed,
  } = useTransactions();
  const { messages, loading, error, sendMessage } = useChat(selectedTransaction, hasAnalyzed);
  const [input, setInput] = useState('');

  const flagged = transactions.filter((t) => t.anomalies.length > 0);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <aside className="fixed bottom-20 right-6 z-50 flex h-[min(520px,calc(100vh-6rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-themed bg-themed-panel shadow-panel animate-slide-up">
        <header className="flex items-center justify-between border-b border-themed px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <RobotIcon />
            </div>
            <div>
              <p className="text-sm font-semibold text-themed-fg">{t('assistant.title')}</p>
              <p className="text-[10px] text-muted">{t('assistant.subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition hover:bg-themed-hover hover:text-themed-fg"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {!hasAnalyzed ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted">
            {t('assistant.analyzeFirst')}
          </div>
        ) : (
          <>
            {flagged.length > 0 && (
              <div className="border-b border-themed px-3 py-2">
                <select
                  value={selectedTransaction?.id ?? ''}
                  onChange={(e) => {
                    const tx = transactions.find((tr) => tr.id === e.target.value);
                    if (tx) setSelectedTransaction(tx);
                  }}
                  className="w-full rounded-lg border border-themed bg-themed px-2 py-1.5 text-xs text-themed-fg outline-none focus:border-primary"
                >
                  {flagged.map((tx) => (
                    <option key={tx.id} value={tx.id}>
                      {tx.id} — {tx.description.slice(0, 30)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              {!selectedTransaction ? (
                <p className="text-center text-sm text-muted">{t('assistant.selectTransaction')}</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'ml-6 bg-primary/20 text-themed-fg'
                          : 'mr-4 border border-themed bg-themed/60 text-themed-fg'
                      }`}
                    >
                      <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1">
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ))}
                  {loading && (
                    <div className="mr-4 flex gap-1 rounded-lg border border-themed px-3 py-2">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
                    </div>
                  )}
                </div>
              )}
              {error && <p className="mt-2 text-xs text-accent">{error}</p>}
            </div>

            <div className="border-t border-themed p-3">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={t('assistant.placeholder')}
                  disabled={!selectedTransaction || loading}
                  className="flex-1 rounded-lg border border-themed bg-themed px-3 py-2 text-sm text-themed-fg outline-none focus:border-primary disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!selectedTransaction || loading || !input.trim()}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
                >
                  {t('assistant.send')}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(['benford', 'outlier', 'duplicate', 'actions'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => sendMessage(t(`assistant.suggestions.${key}`))}
                    className="rounded-md border border-themed px-2 py-0.5 text-[10px] text-muted transition hover:border-primary/40 hover:text-primary"
                  >
                    {t(`assistant.suggestions.${key}`)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function RobotIcon() {
  return (
    <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
  );
}
