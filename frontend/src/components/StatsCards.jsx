/** Placeholder — phase D3 : cartes métriques animées */
export default function StatsCards({ summary }) {
  if (!summary) return null
  return (
    <div className="stats">
      <span>Total: {summary.total}</span>
      <span>Anomalies: {summary.flagged_count}</span>
      <span>{summary.pct_flagged}%</span>
    </div>
  )
}
