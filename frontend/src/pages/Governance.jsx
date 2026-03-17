import React, { useEffect, useState } from 'react'
import ComplaintForm from '../shared/ComplaintForm'
import LiveFeed from '../shared/LiveFeed'
import axios from 'axios'

function normalizeSentiment(value) {
  if (typeof value === 'string') value = value.trim().toLowerCase()
  if (value === 1 || value === '1' || value === 'positive' || value === 'pos') return 1
  if (value === 0 || value === '0' || value === -1 || value === '-1' || value === 'negative' || value === 'neg') return 0
  if (value === 2 || value === '2' || value === 'neutral' || value === 'neu' || value === 'natural') return 2
  return 2
}

export default function Governance(){
  const [stats, setStats] = useState({ positive: 0, negative: 0, neutral: 0, total: 0 })
  
  useEffect(() => {
    axios.get('/api/complaints', { params: { t: Date.now() } }).then(r => {
      const data = r.data || []
      const pos = data.filter(d => normalizeSentiment(d.sentiment) === 1).length
      const neg = data.filter(d => normalizeSentiment(d.sentiment) === 0).length
      const neu = Math.max(0, data.length - pos - neg)
      setStats({ positive: pos, negative: neg, neutral: neu, total: data.length })
    }).catch(() => {})
  }, [])
  
  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-value text-cyan-400">{stats.positive}</div>
          <div className="stat-label">Positive</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-red-400">{stats.negative}</div>
          <div className="stat-label">Negative</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-purple-400">{stats.neutral}</div>
          <div className="stat-label">Neutral</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-slate-400">{stats.total}</div>
          <div className="stat-label">Total Records</div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-1">
          <h2 className="text-xl font-bold text-cyan-400 uppercase tracking-wide mb-6 flex items-center gap-2">
            📋 <span>Submit Complaint</span>
          </h2>
          <ComplaintForm />
        </div>
        <div className="col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-cyan-400 uppercase tracking-wide flex items-center gap-2">
              💬 <span>Complaint Feed</span>
            </h2>
            <span className="text-slate-400 text-sm">{stats.total} records</span>
          </div>
          <LiveFeed />
        </div>
      </div>
    </div>
  )
}
