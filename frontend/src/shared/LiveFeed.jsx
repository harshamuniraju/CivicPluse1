import React, { useEffect, useState } from 'react'
import io from 'socket.io-client'
import axios from 'axios'

const socket = io(import.meta.env.VITE_BACKEND_URL || '/', { autoConnect: true })

function getSentimentLabel(sentiment) {
  return getSentimentValue(sentiment) === 1 ? 'Positive' : getSentimentValue(sentiment) === 0 ? 'Negative' : 'Neutral'
}

function getSentimentColor(sentiment) {
  return getSentimentValue(sentiment) === 1 ? 'positive' : getSentimentValue(sentiment) === 0 ? 'negative' : 'neutral'
}

function getSentimentValue(value) {
  if (typeof value === 'string') value = value.trim().toLowerCase()
  if (value === 1 || value === '1' || value === 'positive' || value === 'pos') return 1
  if (value === 0 || value === '0' || value === -1 || value === '-1' || value === 'negative' || value === 'neg') return 0
  if (value === 2 || value === '2' || value === 'neutral' || value === 'neu' || value === 'natural') return 2
  return 2
}

export default function LiveFeed(){
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')
  
  useEffect(()=>{
    axios.get('/api/complaints', { params: { t: Date.now() } }).then(r=>setItems(r.data || [])).catch(()=>{})
    socket.on('new-complaint', (c)=> setItems(prev=> [c, ...prev]))
    return ()=>{ socket.off('new-complaint') }
  },[])
  
  const filteredItems = filter === 'all' ? items : items.filter(i => getSentimentColor(i.sentiment) === filter)
  
  return (
    <div>
      <div className="flex gap-3 mb-4">
        <button 
          onClick={()=>setFilter('all')}
          className={`px-4 py-2 rounded font-semibold transition ${
            filter === 'all' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-blue-100'
          }`}
        >
          All
        </button>
        <button 
          onClick={()=>setFilter('positive')}
          className={`px-4 py-2 rounded font-semibold transition ${
            filter === 'positive' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-blue-100'
          }`}
        >
          ✓ Positive
        </button>
        <button 
          onClick={()=>setFilter('negative')}
          className={`px-4 py-2 rounded font-semibold transition ${
            filter === 'negative' 
              ? 'bg-rose-500 text-white shadow-sm' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-rose-50'
          }`}
        >
          ✗ Negative
        </button>
        <button 
          onClick={()=>setFilter('neutral')}
          className={`px-4 py-2 rounded font-semibold transition ${
            filter === 'neutral' 
              ? 'bg-blue-400 text-white shadow-sm' 
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-blue-100'
          }`}
        >
          ◯ Neutral
        </button>
      </div>
      
      <div className="space-y-0 max-h-[calc(100vh-400px)] overflow-auto">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No complaints yet</div>
        ) : (
          filteredItems.map(i => (
            <div key={i._id} className={`complaint-card ${getSentimentColor(i.sentiment)}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs text-slate-500">{i.City_or_District || 'City'} • {i.Area || 'Area'} • {new Date(i.createdAt).toLocaleDateString()}</div>
                <span className={`badge-${getSentimentColor(i.sentiment)}`}>{getSentimentLabel(i.sentiment)}</span>
              </div>
              <div className="text-sm text-slate-800 mb-2">{i.text}</div>
              <div className="text-xs text-slate-500">{i.Category && `🏷️ ${i.Category}`}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
