import React, { useEffect, useState } from 'react'
import axios from 'axios'
import io from 'socket.io-client'

const socket = io(import.meta.env.VITE_BACKEND_URL || '/', { autoConnect: true })

const STATUS_OPTIONS = [
  { key: 'yet_to_be_solved', label: 'Yet to be Solved' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
]

function normalizeSentiment(value) {
  if (typeof value === 'string') value = value.trim().toLowerCase()
  if (value === 1 || value === '1' || value === 'positive' || value === 'pos') return 1
  if (value === 0 || value === '0' || value === -1 || value === '-1' || value === 'negative' || value === 'neg') return 0
  if (value === 2 || value === '2' || value === 'neutral' || value === 'neu' || value === 'natural') return 2
  return 2
}

function formatStatus(status) {
  if (status === 'resolved') return 'Resolved'
  if (status === 'in_progress') return 'In Progress'
  return 'Yet to be Solved'
}

function statusClasses(status) {
  if (status === 'resolved') return 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
  if (status === 'in_progress') return 'bg-amber-500/20 border-amber-500 text-amber-300'
  return 'bg-rose-500/20 border-rose-500 text-rose-300'
}

export default function Admin() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')

  useEffect(() => {
    axios
      .get('/api/admin/complaints', { params: { t: Date.now() } })
      .then((r) => setItems(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))

    const onNewComplaint = (item) => setItems((prev) => [item, ...prev])
    const onComplaintUpdated = (updated) =>
      setItems((prev) => prev.map((item) => (item._id === updated._id ? { ...item, ...updated } : item)))

    socket.on('new-complaint', onNewComplaint)
    socket.on('complaint-updated', onComplaintUpdated)
    return () => {
      socket.off('new-complaint', onNewComplaint)
      socket.off('complaint-updated', onComplaintUpdated)
    }
  }, [])

  async function updateStatus(id, status) {
    try {
      setSavingId(id)
      const { data } = await axios.patch(`/api/admin/complaints/${id}/status`, { status })
      setItems((prev) => prev.map((item) => (item._id === id ? { ...item, ...data } : item)))
    } catch (err) {
      console.error(err)
    } finally {
      setSavingId('')
    }
  }

  const filteredItems = items.filter((item) => {
    const sentiment = normalizeSentiment(item.sentiment)
    return sentiment === 0 || sentiment === 2
  })

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-6 py-5">
        <h1 className="text-2xl font-bold text-cyan-400 uppercase tracking-[0.14em]">Admin Complaint Desk</h1>
        <p className="text-slate-400 mt-2">Set each complaint status as Yet to be Solved, In Progress, or Resolved.</p>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading complaints...</div>
      ) : (
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-5 py-6 text-slate-400">No complaints found.</div>
          ) : (
            filteredItems.map((item) => (
              <article key={item._id} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-slate-300 text-sm">
                      {item.City_or_District || 'City'} - {item.Area || 'Area'} - {new Date(item.createdAt).toLocaleString()}
                    </p>
                    <h2 className="text-slate-100 text-lg mt-3 break-words">{item.text}</h2>
                    <p className="text-slate-400 text-sm mt-3">Category: {item.Category || 'General'}</p>
                  </div>

                  <div className="flex flex-col gap-3 lg:items-end">
                    <span className={`text-xs uppercase tracking-[0.12em] px-3 py-1.5 rounded-md border ${statusClasses(item.status)}`}>
                      {formatStatus(item.status)}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map((option) => {
                        const active = item.status === option.key
                        return (
                          <button
                            key={option.key}
                            type="button"
                            disabled={savingId === item._id}
                            onClick={() => updateStatus(item._id, option.key)}
                            className={`px-3 py-2 rounded-md text-sm border transition ${
                              active
                                ? 'bg-cyan-500 border-cyan-400 text-white'
                                : 'bg-slate-900 border-slate-600 text-slate-300 hover:border-cyan-500 hover:text-cyan-300'
                            } ${savingId === item._id ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  )
}
