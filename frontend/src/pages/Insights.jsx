import React, { useEffect, useState } from 'react'
import axios from 'axios'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

function normalizeSentiment(value) {
  if (typeof value === 'string') value = value.trim().toLowerCase()
  if (value === 1 || value === '1' || value === 'positive' || value === 'pos') return 1
  if (value === 0 || value === '0' || value === -1 || value === '-1' || value === 'negative' || value === 'neg') return 0
  if (value === 2 || value === '2' || value === 'neutral' || value === 'neu' || value === 'natural') return 2
  return 2
}

function getSentimentClasses(value) {
  const sentiment = normalizeSentiment(value)
  if (sentiment === 1) {
    return {
      card: 'border-cyan-900 bg-gradient-to-r from-[#112445] to-[#182b49]',
    }
  }
  if (sentiment === 0) {
    return {
      card: 'border-rose-900 bg-gradient-to-r from-[#2a1220] to-[#24172b]',
    }
  }
  return {
    card: 'border-violet-900 bg-gradient-to-r from-[#25163f] to-[#1c203b]',
  }
}

export default function Insights() {
  const [data, setData] = useState([])
  const [votes, setVotes] = useState({})

  useEffect(() => {
    axios.get('/api/complaints', { params: { t: Date.now() } }).then((r) => setData(r.data || [])).catch(() => {})
  }, [])

  const pos = data.filter((d) => normalizeSentiment(d.sentiment) === 1).length
  const neg = data.filter((d) => normalizeSentiment(d.sentiment) === 0).length
  const neu = Math.max(0, data.length - pos - neg)

  const sentimentData = [
    { name: 'Positive', value: pos, fill: '#06b6d4' },
    { name: 'Negative', value: neg, fill: '#ef4444' },
    { name: 'Neutral', value: neu, fill: '#a855f7' },
  ]

  const categoryCount = {}
  data.forEach((d) => {
    const cat = d.Category || 'Other'
    categoryCount[cat] = (categoryCount[cat] || 0) + 1
  })
  const categoryData = Object.entries(categoryCount).map(([name, value]) => ({ name, value }))
  const latestInsights = data.slice(0, 8)

  function setVote(itemKey, value) {
    setVotes((prev) => ({ ...prev, [itemKey]: value }))
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-cyan-400 uppercase tracking-wide mb-2">AI Insights</h2>
        <p className="text-slate-400 uppercase tracking-[0.2em] text-sm">
          Sentiment overview, complaint category trends, and citizen feedback on AI predictions
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Sentiment Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={sentimentData} dataKey="value" nameKey="name" outerRadius={80}>
                {sentimentData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f1f5f9' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Complaints by Category</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f1f5f9' }} />
                <Bar dataKey="value" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-72 flex items-center justify-center text-slate-400">No data available</div>
          )}
        </div>
      </div>

      <section className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-[#111827] to-[#0f172a]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-100 uppercase tracking-[0.16em]">AI Insight Feed</h3>
              <p className="text-slate-400 text-sm mt-2">Review recent complaint posts and mark whether you agree with the AI assessment.</p>
            </div>
            <div className="text-cyan-300 text-sm uppercase tracking-[0.18em]">{latestInsights.length} recent items</div>
          </div>
        </div>

        <div className="divide-y divide-slate-900">
          {latestInsights.length === 0 ? (
            <div className="px-6 py-10 text-slate-400">No insight records available.</div>
          ) : (
            latestInsights.map((item, index) => {
              const itemKey = item._id || `${item.text}-${index}`
              const sentimentClasses = getSentimentClasses(item.sentiment)
              const vote = votes[itemKey]

              return (
                <article key={itemKey} className={`px-6 py-6 border-l-4 ${sentimentClasses.card}`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-slate-400">
                        {item.City_or_District || 'City'} • {item.Area || 'Area'} • {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                      <p className="text-2xl text-white mt-6 leading-relaxed">{item.text}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-5 text-sm text-slate-400">
                        <span>{item.Category || 'General'}</span>
                        {vote && (
                          <span className={vote === 'agree' ? 'text-cyan-300' : 'text-rose-300'}>
                            {vote === 'agree' ? 'Marked as agree' : 'Marked as disagree'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-start lg:items-end gap-4">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setVote(itemKey, 'agree')}
                          className={`px-4 py-2 rounded-lg border text-sm font-semibold transition ${
                            vote === 'agree'
                              ? 'bg-cyan-500 border-cyan-400 text-white'
                              : 'border-slate-600 text-slate-300 hover:border-cyan-500 hover:text-cyan-300'
                          }`}
                        >
                          Agree
                        </button>
                        <button
                          type="button"
                          onClick={() => setVote(itemKey, 'disagree')}
                          className={`px-4 py-2 rounded-lg border text-sm font-semibold transition ${
                            vote === 'disagree'
                              ? 'bg-rose-500 border-rose-400 text-white'
                              : 'border-slate-600 text-slate-300 hover:border-rose-500 hover:text-rose-300'
                          }`}
                        >
                          Disagree
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
