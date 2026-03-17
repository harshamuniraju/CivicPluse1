import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function ComplaintForm(){
  const [city, setCity] = useState('')
  const [area, setArea] = useState('')
  const [category, setCategory] = useState('')
  const [text, setText] = useState('')
  const [status, setStatus] = useState('')
  const [cityOptions, setCityOptions] = useState([])
  const [wardByCity, setWardByCity] = useState({})
  const [categoryOptions, setCategoryOptions] = useState([])
  const wardOptions = city ? wardByCity[city] || [] : []

  function fetchOptions() {
    axios.get('/api/options', { params: { t: Date.now() } })
      .then((r) => {
        const payload = r.data || {}
        setCityOptions(payload.cityOptions || [])
        setWardByCity(payload.wardByCity || {})
        setCategoryOptions(payload.categoryOptions || [])
      })
      .catch(() => {
        setCityOptions([])
        setWardByCity({})
        setCategoryOptions([])
      })
  }

  useEffect(() => {
    fetchOptions()
    const onFocus = () => fetchOptions()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])
  
  async function submit(e){
    e.preventDefault()
    setStatus('sending')
    try{
      await axios.post('/api/complaints', {
        text,
        City_or_District: city,
        Area: area,
        Category: category
      })
      setText('')
      setCity('')
      setArea('')
      setCategory('')
      setStatus('sent')
      setTimeout(() => setStatus(''), 2000)
    }catch(err){
      setStatus('error')
      setTimeout(() => setStatus(''), 2000)
    }
  }
  
  return (
    <form onSubmit={submit} className="space-y-4 bg-slate-800 border border-slate-700 p-6 rounded-lg">
      <div>
        <label className="block text-sm uppercase tracking-wide text-slate-400 mb-2">City / District</label>
        <select
          value={city}
          onChange={e => {
            setCity(e.target.value)
            setArea('')
          }}
          required
          className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded px-4 py-2 focus:outline-none focus:border-cyan-400"
        >
          <option value="">Select city...</option>
          {cityOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm uppercase tracking-wide text-slate-400 mb-2">Ward / Area</label>
        <select
          value={area}
          onChange={e=>setArea(e.target.value)}
          required
          disabled={!city}
          className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded px-4 py-2 focus:outline-none focus:border-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <option value="">Select area...</option>
          {wardOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm uppercase tracking-wide text-slate-400 mb-2">Category</label>
        <select
          value={category}
          onChange={e=>setCategory(e.target.value)}
          required
          className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded px-4 py-2 focus:outline-none focus:border-cyan-400"
        >
          <option value="">Select category...</option>
          {categoryOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm uppercase tracking-wide text-slate-400 mb-2">Complaint Details</label>
        <textarea 
          value={text} 
          onChange={e=>setText(e.target.value)} 
          placeholder="Describe the issue..." 
          className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded px-4 py-2 focus:outline-none focus:border-cyan-400 resize-none" 
          rows={6}
          required
        />
      </div>
      
      <div className="pt-2">
        <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold uppercase tracking-wide rounded py-3 transition">
          Submit Complaint
        </button>
        {status && (
          <div className={`mt-3 p-3 rounded text-center text-sm ${
            status === 'sending' ? 'bg-slate-700 text-slate-300' :
            status === 'sent' ? 'bg-green-900 text-green-200' :
            'bg-red-900 text-red-200'
          }`}>
            {status === 'sending' ? '⏳ Submitting...' : 
             status === 'sent' ? '✓ Submitted successfully!' :
             '✗ Error submitting'}
          </div>
        )}
      </div>
    </form>
  )
}
