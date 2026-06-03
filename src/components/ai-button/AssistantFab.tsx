import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChat } from '../../hooks/useChat';
import { useTransactions } from '../../hooks/useTransactions';
import { useI18n } from '../../i18n';
import AssistantPanel from './AssistantPanel';

export default function AssistantFab() {
  const { openAssistant, setOpenAssistant } = useTransactions();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenAssistant(true)}
        className="fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-themed-panel border border-themed shadow-panel transition hover:scale-105 hover:border-primary/50 hover:shadow-glow"
        aria-label="Assistant"
      >
        <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
      </button>
      {openAssistant && <AssistantPanel onClose={() => setOpenAssistant(false)} />}
    </>
  );
}
