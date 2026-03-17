import React from 'react'
import Governance from './pages/Governance'
import Insights from './pages/Insights'
import Rankings from './pages/Rankings'
import Admin from './pages/Admin'

export default function App(){
  const isAdminPage = window.location.pathname.toLowerCase() === '/admin'

  if (isAdminPage) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <header className="bg-slate-800 border-b border-slate-700 px-8 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-cyan-400 tracking-wide">CIVICPULSE ADMIN</h1>
              <p className="text-slate-400 text-sm uppercase tracking-widest mt-1">Complaint workflow management</p>
            </div>
            <a
              href="/"
              className="px-4 py-2 rounded border border-cyan-600 text-cyan-300 hover:text-white hover:bg-cyan-600 transition"
            >
              Back to Dashboard
            </a>
          </div>
        </header>
        <main className="flex-1 px-8 py-8">
          <div className="max-w-7xl mx-auto">
            <Admin />
          </div>
        </main>
      </div>
    )
  }

  const [route, setRoute] = React.useState('governance')
  const [routeRenderKey, setRouteRenderKey] = React.useState(0)
  const navigate = (nextRoute) => {
    setRoute(nextRoute)
    setRouteRenderKey((v) => v + 1)
  }
  
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-cyan-400 tracking-wide">CIVICPULSE AI</h1>
          <p className="text-slate-400 text-sm uppercase tracking-widest mt-1">Karnataka Civic Governance Intelligence Platform</p>
        </div>
      </header>
      
      <nav className="bg-slate-800 border-b border-slate-700 px-8">
        <div className="max-w-7xl mx-auto flex gap-8">
          <button 
            onClick={()=>navigate('governance')}
            className={`py-4 px-4 border-b-2 font-semibold transition ${
              route==='governance' 
                ? 'border-cyan-400 text-cyan-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📋 GOVERNANCE
          </button>
          <button 
            onClick={()=>navigate('insights')}
            className={`py-4 px-4 border-b-2 font-semibold transition ${
              route==='insights' 
                ? 'border-cyan-400 text-cyan-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            💡 AI INSIGHTS
          </button>
          <button 
            onClick={()=>navigate('rankings')}
            className={`py-4 px-4 border-b-2 font-semibold transition ${
              route==='rankings' 
                ? 'border-cyan-400 text-cyan-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🏆 RANKINGS
          </button>
        </div>
      </nav>
      
      <main className="flex-1 px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {route==='governance' && <Governance key={`governance-${routeRenderKey}`} />}
          {route==='insights' && <Insights key={`insights-${routeRenderKey}`} />}
          {route==='rankings' && <Rankings key={`rankings-${routeRenderKey}`} />}
        </div>
      </main>
    </div>
  )
}
