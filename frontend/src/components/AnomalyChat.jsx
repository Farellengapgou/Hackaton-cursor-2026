/** Placeholder — phase D4 : panneau chat conversationnel */
export default function AnomalyChat({
  transaction,
  explanation,
  onSend,
  chatReply,
  loading,
}) {
  if (!transaction) {
    return <p className="chat-placeholder">Sélectionnez une transaction.</p>
  }
  return (
    <div className="chat-panel">
      <h3>Transaction {transaction.id}</h3>
      {explanation && (
        <pre className="explanation">{explanation.text}</pre>
      )}
      {chatReply && <pre className="chat-reply">{chatReply}</pre>}
      <button
        type="button"
        disabled={loading}
        onClick={() => onSend?.('Dois-je bloquer ce paiement ?')}
      >
        Dois-je bloquer ?
      </button>
    </div>
  )
}
