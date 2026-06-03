import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEMO_TRANSACTIONS,
  computeSummary,
  getDemoStats,
  getQuickInsights,
} from '../data/mockTransactions';
import {
  computeStatsFromTransactions,
  fetchAnomalies,
  fetchStats,
  fetchTransactions,
} from '../services/api';
import { uploadCsv } from '../services/upload';
import type { AuditSummary, StatsData, Transaction } from '../types';

interface TransactionContextValue {
  transactions: Transaction[];
  stats: StatsData;
  summary: AuditSummary;
  insights: string[];
  selectedTransaction: Transaction | null;
  setSelectedTransaction: (tx: Transaction | null) => void;
  uploadLoading: boolean;
  uploadError: string | null;
  hasAnalyzed: boolean;
  handleUpload: (file: File) => Promise<void>;
  refreshFromApi: () => Promise<void>;
  dataSource: 'demo' | 'upload' | 'api';
  openAssistant: boolean;
  setOpenAssistant: (open: boolean) => void;
  assistantTransactionId: string | null;
  openAssistantFor: (transactionId: string | null) => void;
}

const TransactionContext = createContext<TransactionContextValue | null>(null);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(DEMO_TRANSACTIONS);
  const [stats, setStats] = useState<StatsData>(() => getDemoStats());
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(true);
  const [dataSource, setDataSource] = useState<'demo' | 'upload' | 'api'>('demo');
  const [openAssistant, setOpenAssistant] = useState(false);
  const [assistantTransactionId, setAssistantTransactionId] = useState<string | null>(null);

  const summary = useMemo(() => computeSummary(transactions), [transactions]);
  const insights = useMemo(
    () => stats.insights ?? getQuickInsights(transactions),
    [stats.insights, transactions],
  );

  const syncStats = useCallback(async (txs: Transaction[]) => {
    try {
      const remote = await fetchStats();
      setStats(remote);
    } catch {
      setStats(computeStatsFromTransactions(txs));
    }
  }, []);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploadLoading(true);
      setUploadError(null);
      try {
        const parsed = await uploadCsv(file);
        if (parsed.length === 0) throw new Error('Aucune ligne valide dans le CSV.');
        setTransactions(parsed);
        setDataSource('upload');
        setHasAnalyzed(true);
        setSelectedTransaction(null);
        await syncStats(parsed);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Échec de l\'import');
      } finally {
        setUploadLoading(false);
      }
    },
    [syncStats],
  );

  const refreshFromApi = useCallback(async () => {
    try {
      const [txs, anomalies] = await Promise.all([
        fetchTransactions(),
        fetchAnomalies().catch(() => [] as Transaction[]),
      ]);
      const merged = txs.length > 0 ? txs : anomalies;
      if (merged.length > 0) {
        setTransactions(merged);
        setDataSource('api');
        setHasAnalyzed(true);
        await syncStats(merged);
      }
    } catch {
      /* keep demo */
    }
  }, [syncStats]);

  const openAssistantFor = useCallback((transactionId: string | null) => {
    setAssistantTransactionId(transactionId);
    setOpenAssistant(true);
    if (transactionId) {
      const tx = transactions.find((t) => t.id === transactionId) ?? null;
      setSelectedTransaction(tx);
    }
  }, [transactions]);

  const value = useMemo(
    () => ({
      transactions,
      stats,
      summary,
      insights,
      selectedTransaction,
      setSelectedTransaction,
      uploadLoading,
      uploadError,
      hasAnalyzed,
      handleUpload,
      refreshFromApi,
      dataSource,
      openAssistant,
      setOpenAssistant,
      assistantTransactionId,
      openAssistantFor,
    }),
    [
      transactions,
      stats,
      summary,
      insights,
      selectedTransaction,
      uploadLoading,
      uploadError,
      hasAnalyzed,
      handleUpload,
      refreshFromApi,
      dataSource,
      openAssistant,
      assistantTransactionId,
      openAssistantFor,
    ],
  );

  return (
    <TransactionContext.Provider value={value}>{children}</TransactionContext.Provider>
  );
}

export function useTransactionContext() {
  const ctx = useContext(TransactionContext);
  if (!ctx) throw new Error('useTransactionContext must be used within TransactionProvider');
  return ctx;
}
