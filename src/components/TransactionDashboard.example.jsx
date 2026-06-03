import { useMemo } from 'react';
import { useTransaction } from '../hooks/useTransaction';
import ChatPanel from './ChatPanel';
import ExportPDFButton from './ExportPDFButton';

const SAMPLE_TRANSACTIONS = [
  {
    id: 'TX-2026-0042',
    montant: 1250000,
    fournisseur: 'SARL Import Douala',
    score_risque: 82,
    heure: '2026-06-03T14:22:00+01:00',
    anomalies: ['Montant supérieur à la moyenne', 'Fournisseur non référencé'],
  },
  {
    id: 'TX-2026-0041',
    montant: 45000,
    fournisseur: 'Station Total Bastos',
    score_risque: 24,
    heure: '2026-06-03T09:15:00+01:00',
    anomalies: [],
  },
  {
    id: 'TX-2026-0040',
    montant: 890000,
    fournisseur: 'Mobile Money Agent #447',
    score_risque: 71,
    heure: '2026-06-02T18:45:00+01:00',
    anomalies: ['Transaction hors heures ouvrables'],
  },
];

const STATS = {
  total_transactions: 250,
  total_anomalies: 12,
  score_moyen: 78,
};

const ANOMALIES_WITH_AI = [
  {
    id: 'TX-2026-0042',
    montant: 1250000,
    fournisseur: 'SARL Import Douala',
    score_risque: 82,
    explication_ia:
      "Le montant dépasse nettement la moyenne historique pour ce fournisseur non référencé. Une vérification des pièces justificatives et du bon de commande est recommandée avant validation comptable.",
  },
  {
    id: 'TX-2026-0040',
    montant: 890000,
    fournisseur: 'Mobile Money Agent #447',
    score_risque: 71,
    explication_ia:
      "Transaction enregistrée en dehors des heures ouvrables habituelles, ce qui augmente le risque d'erreur ou de fraude interne. Contacter le responsable de caisse pour confirmer l'autorisation.",
  },
];

export default function TransactionDashboard() {
  const { selectedTransaction, setSelectedTransaction } = useTransaction();

  const reportData = useMemo(
    () => ({
      total_transactions: STATS.total_transactions,
      total_anomalies: STATS.total_anomalies,
      score_moyen: STATS.score_moyen,
      anomalies: ANOMALIES_WITH_AI.map(
        ({ id, montant, fournisseur, score_risque, explication_ia }) => ({
          id,
          montant,
          fournisseur,
          score_risque,
          explication_ia,
        }),
      ),
    }),
    [],
  );

  return (
    <div className="flex h-screen bg-gray-100">
      <main className="flex-1 overflow-auto p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900">
            Transactions suspectes
          </h1>
          <ExportPDFButton reportData={reportData} />
        </div>
        <table className="w-full border-collapse overflow-hidden rounded-lg bg-white shadow">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Montant (FCFA)</th>
              <th className="px-4 py-3">Fournisseur</th>
              <th className="px-4 py-3">Risque</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_TRANSACTIONS.map((tx) => {
              const isSelected = selectedTransaction?.id === tx.id;
              return (
                <tr
                  key={tx.id}
                  onClick={() => setSelectedTransaction(tx)}
                  className={`cursor-pointer border-t border-gray-100 transition hover:bg-green-50 ${
                    isSelected ? 'bg-green-100' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {tx.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {tx.montant.toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {tx.fournisseur}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        tx.score_risque > 70
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {tx.score_risque}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </main>

      <aside className="w-[400px] shrink-0 border-l border-gray-200 shadow-lg">
        <ChatPanel transaction={selectedTransaction} />
      </aside>
    </div>
  );
}
