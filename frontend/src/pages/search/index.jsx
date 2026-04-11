import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCollections } from '../../api/collections'
import AnimatedSearch from './components/AnimatedSearch'
import CollectionCard from './components/CollectionCard'
import CollectionListings from './components/CollectionListings'

const BG = (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
    <div className="orb-a" style={{
      position: 'absolute', top: '-10%', left: '-10%',
      width: 320, height: 320, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 70%)',
    }}/>
    <div className="orb-b" style={{
      position: 'absolute', bottom: '5%', right: '-15%',
      width: 280, height: 280, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(3,105,161,0.14) 0%, transparent 70%)',
    }}/>
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    }}/>
  </div>
)

export default function Search() {
  const navigate = useNavigate()

  const [exiting, setExiting]         = useState(false)
  const [collections, setCollections] = useState([])
  const [loadingCols, setLoadingCols] = useState(true)
  const [filter, setFilter]           = useState('')
  const [selected, setSelected]       = useState(null)

  useEffect(() => {
    fetchCollections()
      .then(setCollections)
      .catch(() => {})
      .finally(() => setLoadingCols(false))
  }, [])

  const filtered = collections.filter(c =>
    c.name.toLowerCase().startsWith(filter.toLowerCase().trim())
  )

  if (selected) {
    return <CollectionListings col={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className={exiting ? 'page-exit' : 'page-enter'} style={{ background: '#080808', height: '100svh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {BG}

      {/* header */}
      <div className="px-4"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          paddingTop: 13,
          paddingBottom: 30,
          background: 'linear-gradient(180deg, rgba(88,28,220,0.18) 0%, rgba(60,10,160,0.08) 100%)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(139,92,246,0.15)',
        }}
      >
        <div className="flex items-center" style={{ marginBottom: 40, paddingLeft: 15 }}>
          <h1 className="text-base font-semibold text-white" style={{ position: 'relative' , left: 90, top: 42, }} >Gifts</h1>
          {!loadingCols && (
            <span className="text-xs text-gray-500" style={{ position: 'relative' , left: 100, top: 43 }}>{collections.length} collections</span>
          )}
        </div>

        <div className="flex items-center gap-2" style={{ paddingLeft: 15, position: 'relative', top: 20 }}>
          <button
            onClick={() => { setExiting(true); setTimeout(() => navigate(-1), 300) }}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.06] hover:text-white transition-colors"
            style={{ color: '#a78bfa', flexShrink: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <AnimatedSearch value={filter} onChange={setFilter} />
        </div>
      </div>

      {/* грид коллекций */}

      <div className="flex-1 overflow-y-auto px-4 pb-8 relative z-10" style={{ paddingTop: 10 }}>
        {loadingCols ? (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-500 text-sm">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            Loading collections...
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {filtered.map((col) => (
              <CollectionCard
                key={col.address || col.name}
                col={col}
                onClick={() => setSelected(col)}
              />
            ))}

            {filtered.length === 0 && (
              <div className="col-span-4 flex justify-center py-16">
                <p className="text-gray-600 text-sm">Nothing found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
