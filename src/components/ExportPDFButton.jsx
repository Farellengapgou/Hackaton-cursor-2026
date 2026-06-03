import { useState } from 'react';

const API_URL = 'http://localhost:8000/generate-report';

function formatReportFilename() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `FinAudit_Rapport_${y}${m}${d}.pdf`;
}

function DownloadIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="h-5 w-5 shrink-0 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default function ExportPDFButton({ reportData }) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    if (loading || !reportData) return;

    setLoading(true);
    let objectUrl = null;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);
      const filename = formatReportFilename();

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert('Erreur lors de la génération du PDF');
    } finally {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading || !reportData}
      className="inline-flex items-center gap-2 rounded-xl bg-[#1B5E3B] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#144A2F] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <>
          <Spinner />
          Génération...
        </>
      ) : (
        <>
          <DownloadIcon />
          Exporter le rapport PDF
        </>
      )}
    </button>
  );
}
