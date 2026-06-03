/** Placeholder — phase D3 : tableau coloré + badges risque */
export default function TransactionTable({ transactions, onSelect, selectedId }) {
  if (!transactions?.length) return <p>Aucune transaction.</p>
  return (
    <table className="tx-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Date</th>
          <th>Fournisseur</th>
          <th>Montant</th>
          <th>Score</th>
          <th>Signaux</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((tx) => (
          <tr
            key={tx.id}
            className={selectedId === tx.id ? 'selected' : ''}
            onClick={() => onSelect?.(tx)}
            style={{
              borderLeft: `4px solid ${
                tx.risk_score > 75
                  ? '#D85A30'
                  : tx.risk_score > 40
                    ? '#EF9F27'
                    : '#378ADD'
              }`,
            }}
          >
            <td>{tx.id}</td>
            <td>{tx.date}</td>
            <td>{tx.fournisseur}</td>
            <td>{Number(tx.montant).toLocaleString('fr-FR')} FCFA</td>
            <td>{tx.risk_score}/100</td>
            <td>
              {(tx.anomalies || []).map((a) => (
                <span key={a.rule_name} className="pill">
                  {a.rule_name}
                </span>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
