const API_BASE = import.meta.env.VITE_API_URL || ''

export async function analyzeCsv(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Erreur analyse (${res.status})`)
  }
  return res.json()
}

export async function explainTransaction(transactionId) {
  const res = await fetch(`${API_BASE}/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction_id: transactionId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Erreur explication (${res.status})`)
  }
  return res.json()
}

export async function chatTransaction(transactionId, message, history = []) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transaction_id: transactionId,
      message,
      history,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Erreur chat (${res.status})`)
  }
  return res.json()
}
