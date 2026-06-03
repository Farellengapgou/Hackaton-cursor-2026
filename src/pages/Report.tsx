import ReportPreview from '../components/report/ReportPreview';
import { useTransactions } from '../hooks/useTransactions';

export default function Report() {
  const { transactions, summary } = useTransactions();

  return (
    <div className="animate-fade-in">
      <ReportPreview transactions={transactions} summary={summary} />
    </div>
  );
}
