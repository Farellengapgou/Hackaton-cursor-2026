import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  emptyStats,
  fetchAnomalies,
  fetchStats,
  fetchTransactions,
} from '../services/api';
import { useAuthStore } from '../store/authStore';
import { uploadCsv, type UploadMeta } from '../services/upload';
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
  uploadMeta: UploadMeta | null;
  hasAnalyzed: boolean;
  handleUpload: (file: File) => Promise<void>;
  loadDemoData: () => void;
  refreshFromApi: () => Promise<void>;
  dataSource: 'demo' | 'upload' | 'api';
  anomalyFilter: string | null;
  setAnomalyFilter: (rule: string | null) => void;
  openAssistant: boolean;
  setOpenAssistant: (open: boolean) => void;
  assistantTransactionId: string | null;
  openAssistantFor: (transactionId: string | null) => void;
}

const TransactionContext = createContext<TransactionContextValue | null>(null);

function initialTransactionState() {
  return {
    transactions: [] as Transaction[],
    stats: emptyStats(),
    selectedTransaction: null as Transaction | null,
    uploadLoading: false,
    uploadError: null as string | null,
    uploadMeta: null as UploadMeta | null,
    hasAnalyzed: false,
    dataSource: 'api' as const,
    anomalyFilter: null as string | null,
    openAssistant: false,
    assistantTransactionId: null as string | null,
  };
}

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<StatsData>(() => emptyStats());
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadMeta, setUploadMeta] = useState<UploadMeta | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [dataSource, setDataSource] = useState<'demo' | 'upload' | 'api'>('api');
  const [anomalyFilter, setAnomalyFilter] = useState<string | null>(null);
  const [openAssistant, setOpenAssistant] = useState(false);
  const [assistantTransactionId, setAssistantTransactionId] = useState<string | null>(null);

  const resetSession = useCallback(() => {
    const fresh = initialTransactionState();
    setTransactions(fresh.transactions);
    setStats(fresh.stats);
    setSelectedTransaction(fresh.selectedTransaction);
    setUploadLoading(fresh.uploadLoading);
    setUploadError(fresh.uploadError);
    setUploadMeta(fresh.uploadMeta);
    setHasAnalyzed(fresh.hasAnalyzed);
    setDataSource(fresh.dataSource);
    setAnomalyFilter(fresh.anomalyFilter);
    setOpenAssistant(fresh.openAssistant);
    setAssistantTransactionId(fresh.assistantTransactionId);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      resetSession();
      return;
    }
    resetSession();
  }, [user?.id, resetSession]);

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
        const { transactions: parsed, meta } = await uploadCsv(file);
        if (parsed.length === 0) throw new Error('Aucune ligne valide dans le fichier.');
        setTransactions(parsed);
        setUploadMeta(meta);
        setDataSource('upload');
        setHasAnalyzed(true);
        setSelectedTransaction(null);
        setAnomalyFilter(null);
        await syncStats(parsed);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Échec de l\'import');
        setUploadMeta(null);
      } finally {
        setUploadLoading(false);
      }
    },
    [syncStats],
  );

  const loadDemoData = useCallback(() => {
    setTransactions(DEMO_TRANSACTIONS);
    setStats(getDemoStats());
    setDataSource('demo');
    setHasAnalyzed(true);
    setUploadMeta({
      fileName: 'données_démonstration.csv',
      rowCount: DEMO_TRANSACTIONS.length,
      analyzedAt: new Date().toISOString(),
    });
    setUploadError(null);
    setSelectedTransaction(null);
  }, []);

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
      /* keep current */
    }
  }, [syncStats]);

  const openAssistantFor = useCallback(
    (transactionId: string | null) => {
      setAssistantTransactionId(transactionId);
      setOpenAssistant(true);
      if (transactionId) {
        const tx = transactions.find((t) => t.id === transactionId) ?? null;
        setSelectedTransaction(tx);
      }
    },
    [transactions],
  );

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
      uploadMeta,
      hasAnalyzed,
      handleUpload,
      loadDemoData,
      refreshFromApi,
      dataSource,
      anomalyFilter,
      setAnomalyFilter,
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
      uploadMeta,
      hasAnalyzed,
      handleUpload,
      loadDemoData,
      refreshFromApi,
      dataSource,
      anomalyFilter,
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
