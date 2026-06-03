import { useState } from 'react'
import { analyzeCsv, chatTransaction, explainTransaction } from './api/client'
import AnomalyChat from './components/AnomalyChat'
import FileUpload from './components/FileUpload'
import StatsCards from './components/StatsCards'
import TransactionTable from './components/TransactionTable'
import './App.css'

function App() {
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [selected, setSelected] = useState(null)
  const [explanation, setExplanation] = useState(null)
  const [chatReply, setChatReply] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleFile(file) {
    setLoading(true)
    setError(null)
    setSelected(null)
    setExplanation(null)
    setChatReply(null)
    try {
      const data = await analyzeCsv(file)
      setSummary(data.summary)
      setTransactions(data.transactions || [])
    } catch (e) {
      setError(e.message)
      setSummary(null)
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSelect(tx) {
    setSelected(tx)
    setExplanation(null)
    setChatReply(null)
    setLoading(true)
    try {
      const exp = await explainTransaction(tx.id)
      setExplanation(exp)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleChat(message) {
    if (!selected) return
    setLoading(true)
    try {
      const res = await chatTransaction(selected.id, message)
      setChatReply(res.reply)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header>
        <h1>FinAudit</h1>
        <p>Détecteur d&apos;anomalies comptables — Thème 11 J.U.I.N 2026</p>
      </header>

      <section className="upload-section">
        <FileUpload onFile={handleFile} disabled={loading} />
        {loading && <p>Analyse en cours…</p>}
        {error && <p className="error">{error}</p>}
      </section>

      <StatsCards summary={summary} />

      <div className="main-grid">
        <TransactionTable
          transactions={transactions}
          selectedId={selected?.id}
          onSelect={handleSelect}
        />
        <AnomalyChat
          transaction={selected}
          explanation={explanation}
          chatReply={chatReply}
          loading={loading}
          onSend={handleChat}
        />
      </div>
    </div>
  )
}

export default App
