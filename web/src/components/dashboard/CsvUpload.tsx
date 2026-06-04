import { useCallback, useState } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import { useI18n } from '../../i18n';

const ACCEPT = '.csv,.xlsx,.xls';

export default function CsvUpload() {
  const { handleUpload, uploadLoading, uploadError } = useTransactions();
  const { t } = useI18n();
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      await handleUpload(file);
    },
    [handleUpload],
  );

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      await processFile(e.dataTransfer.files[0]);
    },
    [processFile],
  );

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processFile(e.target.files?.[0]);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`relative rounded-xl border-2 border-dashed p-6 text-center transition-all duration-300 sm:p-8 ${
        dragOver
          ? 'border-primary bg-primary/10 shadow-glow'
          : 'border-themed bg-themed-hover/30 hover:border-primary/50'
      }`}
    >
      <input
        type="file"
        accept={ACCEPT}
        onChange={onFileChange}
        className="absolute inset-0 cursor-pointer opacity-0"
        disabled={uploadLoading}
      />
      <div className="pointer-events-none">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/30">
          {uploadLoading ? (
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          )}
        </div>
        <p className="text-sm font-medium text-themed-fg">
          {uploadLoading ? t('dashboard.analyzing') : t('dashboard.uploadTitle')}
        </p>
        <p className="mt-1 text-xs text-muted">
          {t('dashboard.uploadSubtitle')} — CSV, XLSX, XLS
        </p>
        {uploadError && <p className="mt-3 text-xs text-danger">{uploadError}</p>}
      </div>
      {uploadLoading && (
        <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-xl bg-themed-skeleton">
          <div className="h-full w-1/3 animate-pulse bg-primary" />
        </div>
      )}
    </div>
  );
}
