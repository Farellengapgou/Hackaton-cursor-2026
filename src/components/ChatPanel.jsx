import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';

function formatMontant(montant) {
  return Number(montant).toLocaleString('fr-FR');
}

function buildGreeting(transaction) {
  return {
    role: 'assistant',
    content: `Bonjour ! Je suis **FinAudit AI**, votre assistant d'audit financier pour les PME d'Afrique centrale.

Je suis prêt à analyser la transaction **${transaction.id}** d'un montant de **${formatMontant(transaction.montant)} FCFA**.

Posez-moi vos questions sur les anomalies détectées, le score de risque ou les bonnes pratiques de contrôle.`,
  };
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#1B5E3B] px-4 py-2.5 text-sm text-white">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm prose prose-sm prose-headings:text-gray-900 prose-p:my-1 prose-ul:my-1 prose-li:my-0">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </div>
  );
}

export default function ChatPanel({ transaction }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const lastTransactionIdRef = useRef(null);

  useEffect(() => {
    if (!transaction) {
      setMessages([]);
      lastTransactionIdRef.current = null;
      return;
    }
    if (transaction.id !== lastTransactionIdRef.current) {
      lastTransactionIdRef.current = transaction.id;
      setMessages([buildGreeting(transaction)]);
      setInput('');
      setLoading(false);
    }
  }, [transaction]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !transaction) return;

    const userMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, transaction }),
      });

      if (!res.ok) {
        throw new Error('Request failed');
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ Erreur de connexion au serveur.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, transaction]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!transaction) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 p-6 text-center text-sm text-gray-500">
        Sélectionnez une transaction pour démarrer la conversation.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <header className="shrink-0 bg-[#1B5E3B] px-4 py-4 text-white shadow-md">
        <h2 className="text-lg font-semibold tracking-tight">FinAudit AI</h2>
        <p className="mt-0.5 text-sm text-green-100 opacity-90">
          Transaction {transaction.id}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          {messages.map((msg, index) => (
            <MessageBubble key={`${msg.role}-${index}`} message={msg} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-200 bg-white p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Posez votre question sur cette transaction…"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#1B5E3B] focus:ring-1 focus:ring-[#1B5E3B] disabled:bg-gray-100"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-lg bg-[#1B5E3B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#164d31] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
