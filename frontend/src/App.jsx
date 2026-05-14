import React from 'react'
import Governance from './pages/Governance'
import Insights from './pages/Insights'
import Rankings from './pages/Rankings'
import Admin from './pages/Admin'

export default function App(){
  const [theme, setTheme] = React.useState(() => {
    if (typeof window === 'undefined') return 'light'
    return window.localStorage.getItem('civicpulse-theme') || 'light'
  })
  const isAdminPage = window.location.pathname.toLowerCase() === '/admin'

  React.useEffect(() => {
    document.body.classList.remove('theme-light', 'theme-dark')
    document.body.classList.add(`theme-${theme}`)
    window.localStorage.setItem('civicpulse-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
  }

  if (isAdminPage) {
    return (
      <div className={`app-shell min-h-screen bg-transparent flex flex-col theme-${theme}`}>
        <header className="app-header bg-white border-b border-slate-200 px-8 py-6 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-blue-600 tracking-wide">CIVICPULSE ADMIN</h1>
              <p className="text-slate-500 text-sm uppercase tracking-widest mt-1">Complaint workflow management</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="theme-toggle px-4 py-2 rounded-xl border border-slate-200 text-blue-600 hover:text-white hover:bg-blue-600 transition"
              >
                {theme === 'light' ? 'Dark Theme' : 'Light Theme'}
              </button>
              <a
                href="/"
                className="theme-toggle px-4 py-2 rounded-xl border border-slate-200 text-blue-600 hover:text-white hover:bg-blue-600 transition"
              >
                Back to Dashboard
              </a>
            </div>
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
    <div className={`app-shell min-h-screen bg-transparent flex flex-col theme-${theme}`}>
      <header className="app-header bg-white border-b border-slate-200 px-8 py-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-600 tracking-wide">CIVICPULSE AI</h1>
            <p className="text-slate-500 text-sm uppercase tracking-widest mt-1">Karnataka Civic Governance Intelligence Platform</p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle px-4 py-2 rounded-xl border border-slate-200 text-blue-600 hover:text-white hover:bg-blue-600 transition"
          >
            {theme === 'light' ? 'Dark Theme' : 'Light Theme'}
          </button>
        </div>
      </header>
      
      <nav className="app-nav bg-white border-b border-slate-200 px-8">
        <div className="max-w-7xl mx-auto flex gap-8">
          <button 
            onClick={()=>navigate('governance')}
            className={`py-4 px-4 border-b-2 font-semibold transition ${
              route==='governance' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            📋 GOVERNANCE
          </button>
          <button 
            onClick={()=>navigate('insights')}
            className={`py-4 px-4 border-b-2 font-semibold transition ${
              route==='insights' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            💡 AI INSIGHTS
          </button>
          <button 
            onClick={()=>navigate('rankings')}
            className={`py-4 px-4 border-b-2 font-semibold transition ${
              route==='rankings' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
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
