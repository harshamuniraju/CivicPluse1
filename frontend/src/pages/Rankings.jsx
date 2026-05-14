import React, { useEffect, useState } from 'react'
import axios from 'axios'
import io from 'socket.io-client'

const socket = io(import.meta.env.VITE_BACKEND_URL || '/', { autoConnect: true })

function normalizeSentiment(value) {
  if (typeof value === 'string') value = value.trim().toLowerCase()
  if (value === 1 || value === '1' || value === 'positive' || value === 'pos') return 1
  if (value === 0 || value === '0' || value === -1 || value === '-1' || value === 'negative' || value === 'neg') return 0
  if (value === 2 || value === '2' || value === 'neutral' || value === 'neu' || value === 'natural') return 2
  return 2
}

function normalizeCityName(value) {
  const city = String(value || '').trim()
  if (!city) return 'Unknown'
  const normalized = city.toLowerCase()
  if (normalized === 'bangalore') return 'Bengaluru'
  if (normalized === 'bengaluru urban') return 'Bengaluru'
  return city
}

export default function Rankings() {
  const [data, setData] = useState([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const excludedCities = new Set(['Amaravati', 'Ahmedabad', 'Chennai'])

  useEffect(() => {
    axios.get('/api/complaints', { params: { t: Date.now() } }).then((r) => setData(r.data || [])).catch(() => {})

    const handleNewComplaint = (complaint) => {
      setData((prev) => [complaint, ...prev])
      setIsRefreshing(true)
    }

    socket.on('new-complaint', handleNewComplaint)
    return () => {
      socket.off('new-complaint', handleNewComplaint)
    }
  }, [])

  useEffect(() => {
    if (!isRefreshing) return
    const timer = setTimeout(() => setIsRefreshing(false), 1200)
    return () => clearTimeout(timer)
  }, [isRefreshing])

  const rankings = {}
  data.forEach((d) => {
    const key = normalizeCityName(d.City_or_District)
    if (excludedCities.has(key)) return
    if (!rankings[key]) rankings[key] = { positive: 0, negative: 0, neutral: 0, total: 0 }
    rankings[key].total++
    const sentiment = normalizeSentiment(d.sentiment)
    if (sentiment === 1) rankings[key].positive++
    else if (sentiment === 0) rankings[key].negative++
    else rankings[key].neutral++
  })

  const rankedList = Object.entries(rankings)
    .map(([city, stats]) => ({
      city,
      ...stats,
      score: Number((((stats.positive - stats.negative * 0.7) / stats.total) * 100 + 50).toFixed(2)),
    }))
    .sort((a, b) => b.score - a.score)

  const topPerformers = rankedList.filter((item) => item.score >= 55).slice(0, 3)
  const worstPerformers = [...rankedList].sort((a, b) => a.score - b.score).slice(0, 4)

  function mlaName(city) {
    return `MLA_${city.replace(/\s+/g, '_')}`
  }

  return (
    <div className="min-h-[70vh] bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200 bg-blue-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-[0.18em] text-blue-600">CivicPulse AI</h1>
            <p className="text-[0.95rem] uppercase tracking-[0.45em] text-slate-500 mt-2">Karnataka Civic Governance Intelligence Platform</p>
          </div>
          <div className="self-start md:self-auto inline-flex items-center gap-3 px-4 py-2 border border-slate-200 rounded-xl bg-white text-blue-600 text-sm uppercase tracking-[0.25em] shadow-sm">
            {isRefreshing ? 'Updating' : 'Live'} · {data.length} Records
            <span className="h-2.5 w-2.5 rounded-full bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.45)]" />
          </div>
        </div>
      </div>

      <div className="px-6 py-8 space-y-10">
        <section>
          <h2 className="text-[1.95rem] font-black uppercase tracking-[0.22em] text-blue-600">Top Performers</h2>
          <p className="text-slate-500 tracking-[0.25em] uppercase mt-3">Cities with governance score above 55</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {topPerformers.map((item, idx) => (
              <article
                key={item.city}
                className={`rounded-3xl border border-blue-100 bg-blue-100 p-5 shadow-sm transition duration-500 ${
                  isRefreshing ? 'scale-[1.02] shadow-lg' : ''
                }`}
              >
                <div className="text-blue-600 uppercase tracking-[0.2em] font-semibold">#{idx + 1} Ranked</div>
                <h3 className="text-3xl mt-3 font-black uppercase tracking-[0.12em] text-slate-800">{item.city}</h3>
                <div className="text-6xl leading-none mt-4 font-black text-blue-600">{Math.round(item.score)}</div>
                <p className="text-slate-500 mt-4">{mlaName(item.city)}</p>
                <p className="text-slate-700 mt-2 tracking-[0.08em]">{item.positive} positive · {item.negative} negative</p>
              </article>
            ))}
            {topPerformers.length === 0 && (
              <div className="col-span-full rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-500">No top performers yet.</div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-[1.95rem] font-black uppercase tracking-[0.22em] text-rose-600">MLA of Shame</h2>
          <p className="text-slate-500 tracking-[0.22em] uppercase mt-3">Worst performing regions - Citizens demand accountability</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
            {worstPerformers.map((item, idx) => (
              <article
                key={item.city}
                className={`rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 p-5 shadow-sm transition duration-500 ${
                  isRefreshing ? 'scale-[1.02] shadow-lg' : ''
                }`}
              >
                <div className="text-rose-700 uppercase tracking-[0.16em] font-semibold">#{idx + 1} Worst Performer</div>
                <h3 className="text-3xl mt-3 font-black uppercase tracking-[0.12em] text-slate-800">{item.city}</h3>
                <div className="text-6xl leading-none mt-4 font-black text-rose-500">{Math.max(0, Math.round(item.score))}</div>
                <p className="text-slate-500 mt-4">{mlaName(item.city)}</p>
                <p className="text-rose-700 mt-2 tracking-[0.08em]">{item.negative} negative complaints</p>
              </article>
            ))}
            {worstPerformers.length === 0 && (
              <div className="col-span-full rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-500">No records available.</div>
            )}
          </div>
        </section>
      </div>

      {rankedList.length > 0 && (
        <div className="px-6 pb-8">
          <div className={`overflow-x-auto rounded-2xl border border-slate-200 bg-white transition duration-500 ${isRefreshing ? 'ring-2 ring-blue-100' : ''}`}>
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-blue-100 text-slate-700 uppercase tracking-[0.12em]">
                <tr>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Positive</th>
                  <th className="px-4 py-3">Negative</th>
                  <th className="px-4 py-3">Neutral</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {rankedList.map((item) => (
                  <tr key={`table-${item.city}`} className="border-t border-slate-100 text-slate-700">
                    <td className="px-4 py-3 font-semibold">{item.city}</td>
                    <td className="px-4 py-3">{item.score}</td>
                    <td className="px-4 py-3 text-blue-600">{item.positive}</td>
                    <td className="px-4 py-3 text-rose-500">{item.negative}</td>
                    <td className="px-4 py-3 text-blue-400">{item.neutral}</td>
                    <td className="px-4 py-3">{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rankedList.length === 0 && <div className="px-6 pb-8 text-slate-500">No data available yet.</div>}
    </div>
  )
}
