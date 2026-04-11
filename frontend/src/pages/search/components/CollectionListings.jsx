import { useState, useEffect } from 'react'
import { fetchListings } from '../../../api/listings'
import ListingCard from './ListingCard'

function CollectionAvatar({ col }) {
  const [imgOk, setImgOk] = useState(!!col.image)
  const initials = col.name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('')

  return imgOk ? (
    <img
      src={col.image}
      alt={col.name}
      className="w-12 h-12 rounded-xl object-cover"
      onError={() => setImgOk(false)}
    />
  ) : (
    <div className="w-12 h-12 rounded-xl bg-white/[0.08] flex items-center justify-center text-sm font-semibold text-gray-300">
      {initials}
    </div>
  )
}

export default function CollectionListings({ col, onBack }) {
  const [allItems, setAllItems]         = useState(null)
  const [modelFilter, setModelFilter]   = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  const models = allItems
    ? [...new Set(allItems.map(i => i.model).filter(Boolean))].sort()
    : []

  const items = allItems
    ? (modelFilter ? allItems.filter(i => i.model === modelFilter) : allItems)
    : null

  useEffect(() => {
    fetchListings({ collection: col.name, page: 1, pageSize: 500 })
      .then(data => setAllItems(data.items))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [col.name])

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

  return (
    <div style={{ background: '#080808', height: '100svh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {BG}

      {/* шапка */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 relative z-10">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] text-gray-400 hover:text-white transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <CollectionAvatar col={col} />
        <h1 className="text-base font-semibold text-white capitalize">{col.name}</h1>

        {/* кнопка фильтра моделей */}
        {models.length > 0 && (
          <button
            onClick={() => setDropdownOpen(o => !o)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors"
            style={{
              background: modelFilter ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)',
              border: '1px solid',
              borderColor: modelFilter ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.1)',
              color: modelFilter ? '#a78bfa' : 'rgba(255,255,255,0.5)',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <span>{modelFilter || 'Model'}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points={dropdownOpen ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}/>
            </svg>
          </button>
        )}
      </div>

      {/* дропдаун со списком моделей */}
      {dropdownOpen && (
        <div className="relative z-30 mx-4 mb-2">
          <div style={{
            background: 'rgba(18,8,40,0.97)',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 16,
            maxHeight: 280,
            overflowY: 'auto',
            backdropFilter: 'blur(20px)',
          }}>
            <button
              onClick={() => { setModelFilter(null); setDropdownOpen(false) }}
              className="w-full text-left px-4 py-3 text-sm"
              style={{
                color: !modelFilter ? '#a78bfa' : 'rgba(255,255,255,0.6)',
                background: !modelFilter ? 'rgba(139,92,246,0.1)' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >All models</button>

            {models.map((m, i) => (
              <button
                key={m}
                onClick={() => { setModelFilter(m); setDropdownOpen(false) }}
                className="w-full text-left px-4 py-3 text-sm capitalize"
                style={{
                  color: modelFilter === m ? '#a78bfa' : 'rgba(255,255,255,0.6)',
                  background: modelFilter === m ? 'rgba(139,92,246,0.1)' : 'transparent',
                  borderBottom: i < models.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}
              >{m}</button>
            ))}
          </div>
        </div>
      )}

      {/* список листингов */}
      <div className="flex-1 px-4 pb-8 flex flex-col gap-2 relative z-10 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-500 text-sm">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            Loading...
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {items && (
          <>
            <p className="text-gray-600 text-xs px-1 pb-1">
              {items.length} listing{items.length !== 1 ? 's' : ''}
              {modelFilter && <span className="ml-1 text-purple-400">· {modelFilter}</span>}
            </p>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <p className="text-gray-600 text-sm">No listings for this model</p>
              </div>
            ) : (
              items.map((item, i) => <ListingCard key={i} item={item} />)
            )}
          </>
        )}
      </div>
    </div>
  )
}
