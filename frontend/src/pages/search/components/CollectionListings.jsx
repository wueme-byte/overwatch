import { useState, useEffect, useRef } from 'react'
import { fetchListings } from '../../../api/listings'
import ListingCard from './ListingCard'

function CollectionAvatar({ col }) {
  const [imgOk, setImgOk] = useState(!!col.image)
  const initials = col.name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('')

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {imgOk ? (
        <img
          src={col.image}
          alt={col.name}
          onError={() => setImgOk(false)}
          style={{ width: 80, height: 44, borderRadius: 12, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'rgba(139,92,246,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: '#a78bfa',
        }}>{initials}</div>
      )}
      <div style={{
        position: 'absolute', inset: -2, borderRadius: 14,
        border: '1.5px solid rgba(139,92,246,0.35)',
        pointerEvents: 'none',
      }}/>
    </div>
  )
}

const PAGE_SIZE = 15

const BG = (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
    <div style={{
      position: 'absolute', top: '-10%', left: '-10%',
      width: 320, height: 320, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 70%)',
    }}/>
    <div style={{
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

export default function CollectionListings({ col, onBack }) {
  const [items, setItems]             = useState(null)
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(1)
  const [models, setModels]           = useState([])
  const [modelFilter, setModelFilter] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const scrollRef                     = useRef(null)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  useEffect(() => {
    fetchListings({ collection: col.name, page: 1, pageSize: 500 })
      .then(data => {
        const unique = [...new Set(data.items.map(i => i.model).filter(Boolean))].sort()
        setModels(unique)
      })
  }, [col.name])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchListings({ collection: col.name, page, pageSize: PAGE_SIZE, model: modelFilter || undefined })
      .then(data => {
        // если одинаковый подарок на обоих маркетах — оставляем Fragment
        const map = new Map()
        for (const item of data.items) {
          const existing = map.get(item.name)
          if (!existing || item.marketplace === 'Fragment') {
            map.set(item.name, item)
          }
        }
        setItems([...map.values()])
        setTotal(data.total)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [col.name, page, modelFilter])

  function handleModelFilter(m) {
    setModelFilter(m)
    setPage(1)
    setDropdownOpen(false)
  }

  return (
    <div style={{ background: '#080808', height: '100svh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {BG}

      {/* ── шапка ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        padding: '95px 16px 12px',
        background: 'linear-gradient(180deg, rgba(88,28,220,0.18) 0%, rgba(60,10,160,0.08) 100%)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(139,92,246,0.15)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

          {/* назад */}
          <button
            onClick={onBack}
            style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(139,92,246,0.12)',
              border: '1px solid rgba(139,92,246,0.25)',
              color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <CollectionAvatar col={col} />

          {/* название + счётчик */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h1 style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '-0.4px',
              lineHeight: 1,
              textTransform: 'capitalize',
              margin: 0,
              background: 'linear-gradient(135deg, #ffffff 30%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {col.name}
            </h1>
            {total > 0 && (
              <span style={{
                fontSize: 11,
                fontWeight: 500,
                color: '#a78bfa',
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.25)',
                borderRadius: 999,
                padding: '3px 10px',
                letterSpacing: '0.2px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {total} listing{total !== 1 ? 's' : ''}
                {modelFilter && <span style={{ opacity: 0.7, marginLeft: 4 }}>· {modelFilter}</span>}
              </span>
            )}
          </div>

          {/* кнопка фильтра моделей */}
          {models.length > 0 && (
            <button
              onClick={() => setDropdownOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 999, flexShrink: 0,
                background: modelFilter ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.12)',
                border: `1px solid ${modelFilter ? 'rgba(139,92,246,0.45)' : 'rgba(139,92,246,0.25)'}`,
                color: '#a78bfa',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
                <line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
              <span>{modelFilter || 'Model'}</span>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                <polyline points={dropdownOpen ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/>
              </svg>
            </button>
          )}
        </div>

        {/* дропдаун */}
        {dropdownOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 16, left: 16,
            zIndex: 30,
            background: 'rgba(12,5,30,0.97)',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 16,
            maxHeight: 260,
            overflowY: 'auto',
          }}>
            <button
              onClick={() => handleModelFilter(null)}
              style={{
                width: '100%', textAlign: 'left', padding: '11px 16px', fontSize: 13,
                color: !modelFilter ? '#a78bfa' : 'rgba(255,255,255,0.55)',
                background: !modelFilter ? 'rgba(139,92,246,0.1)' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer',
              }}
            >All models</button>

            {models.map((m, i) => (
              <button
                key={m}
                onClick={() => handleModelFilter(m)}
                style={{
                  width: '100%', textAlign: 'left', padding: '11px 16px', fontSize: 13,
                  textTransform: 'capitalize',
                  color: modelFilter === m ? '#a78bfa' : 'rgba(255,255,255,0.55)',
                  background: modelFilter === m ? 'rgba(139,92,246,0.1)' : 'transparent',
                  borderBottom: i < models.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  cursor: 'pointer',
                }}
              >{m}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── список ── */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 32px', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 10, color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
            <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            Loading...
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 14, padding: '12px 16px', color: '#f87171', fontSize: 13,
          }}>{error}</div>
        )}

        {items && !loading && (
          <>
            {items.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No listings found</p>
              </div>
            ) : (
              items.map((item, i) => <ListingCard key={i} item={item} />)
            )}

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 8 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: page === 1 ? 'rgba(255,255,255,0.15)' : '#a78bfa',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: page === 1 ? 'default' : 'pointer',
                    transition: 'opacity 150ms',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>

                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.5px' }}>
                  <span style={{ color: '#a78bfa', fontWeight: 600 }}>{page}</span>
                  <span style={{ margin: '0 4px' }}>/</span>
                  {totalPages}
                </span>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: page === totalPages ? 'rgba(255,255,255,0.15)' : '#a78bfa',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: page === totalPages ? 'default' : 'pointer',
                    transition: 'opacity 150ms',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
