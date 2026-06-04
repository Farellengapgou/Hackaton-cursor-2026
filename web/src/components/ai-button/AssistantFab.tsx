import { useTransactions } from '../../hooks/useTransactions';
import AssistantPanel from './AssistantPanel';

function RobotIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? 'h-7 w-7 text-white'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <rect x="5" y="8" width="14" height="11" rx="2" strokeWidth={1.75} />
      <circle cx="9" cy="13" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="15" cy="13" r="1.35" fill="currentColor" stroke="none" />
      <path strokeLinecap="round" strokeWidth={1.75} d="M9 17h6M12 8V5M8 5h8" />
      <path strokeLinecap="round" strokeWidth={1.75} d="M5 11H3M21 11h-2" />
    </svg>
  );
}

export default function AssistantFab() {
  const { openAssistant, setOpenAssistant } = useTransactions();

  return (
    <>
      <div className="fixed bottom-5 right-5 z-30 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
        <span className="hidden rounded-md bg-[#0F2027] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-lg sm:block">
          Assistant IA
        </span>
        <button
          type="button"
          onClick={() => setOpenAssistant(true)}
          className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-[0_4px_24px_rgba(29,158,117,0.45)] ring-4 ring-primary/25 transition hover:scale-110 hover:bg-primary-dark hover:shadow-[0_6px_32px_rgba(29,158,117,0.55)] focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50"
          aria-label="Ouvrir l'assistant d'audit IA"
        >
          <span
            className="absolute inset-0 animate-ping rounded-full bg-primary/40 opacity-75"
            aria-hidden
          />
          <span className="relative flex h-full w-full items-center justify-center rounded-full">
            <RobotIcon />
          </span>
        </button>
      </div>
      {openAssistant && <AssistantPanel onClose={() => setOpenAssistant(false)} />}
    </>
  );
}
