import { useState, useEffect, useRef } from 'react'
import { fetchListings } from '../../../api/listings'
import ListingCard from './ListingCard'
import { backdropCss } from '../../../lib/backdropColors'

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
  const [items, setItems]                   = useState(null)
  const [total, setTotal]                   = useState(0)
  const [page, setPage]                     = useState(1)
  const [models, setModels]                 = useState([])
  const [backdrops, setBackdrops]           = useState([])
  const [modelFilter, setModelFilter]       = useState(null)
  const [backdropFilter, setBackdropFilter] = useState(null)
  const [dropdownOpen, setDropdownOpen]     = useState(false)
  const [backdropOpen, setBackdropOpen]     = useState(false)
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState(null)
  const scrollRef                           = useRef(null)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchListings({ collection: col.name, page, pageSize: PAGE_SIZE, model: modelFilter || undefined, backdrop: backdropFilter || undefined })
      .then(data => {
        setItems(data.items)
        setTotal(data.total)
        if (data.models && data.models.length > 0) setModels(prev => prev.length > 0 ? prev : data.models.map(m => typeof m === 'string' ? { name: m, image: null } : m))
        if (data.backdrops && data.backdrops.length > 0) setBackdrops(prev => prev.length > 0 ? prev : data.backdrops)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [col.name, page, modelFilter, backdropFilter])

  function handleModelFilter(m) {
    setModelFilter(m)
    setPage(1)
    setDropdownOpen(false)
  }

  function handleBackdropFilter(b) {
    setBackdropFilter(b)
    setPage(1)
    setBackdropOpen(false)
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '-0.4px',
              lineHeight: 1.3,
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
                display: 'inline-block',
                marginTop: 4,
                fontSize: 11,
                fontWeight: 500,
                color: '#a78bfa',
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.25)',
                borderRadius: 999,
                padding: '3px 10px',
                letterSpacing: '0.2px',
                whiteSpace: 'nowrap',
              }}>
                {total} listing{total !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* фильтры: Colors сверху, Model снизу */}
          {(models.length > 0 || backdrops.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, alignItems: 'flex-end', alignSelf: 'flex-end' }}>

              {backdrops.length > 0 && (
                <button
                  onClick={() => { setBackdropOpen(o => !o); setDropdownOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px', borderRadius: 999,
                    background: backdropFilter ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.12)',
                    border: `1px solid ${backdropFilter ? 'rgba(139,92,246,0.45)' : 'rgba(139,92,246,0.25)'}`,
                    color: '#a78bfa', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  {backdropFilter ? (
                    <div style={{
                      width: 11, height: 11, borderRadius: '50%', flexShrink: 0,
                      background: backdropCss(backdropFilter),
                      boxShadow: `0 0 6px ${backdropCss(backdropFilter)}88`,
                    }} />
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="13.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                        <circle cx="17.5" cy="10.5" r="1" fill="currentColor" stroke="none"/>
                        <circle cx="8.5" cy="7.5" r="1" fill="currentColor" stroke="none"/>
                        <circle cx="6.5" cy="12.5" r="1" fill="currentColor" stroke="none"/>
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
                      </svg>
                      <span>Color</span>
                    </>
                  )}
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                    <polyline points={backdropOpen ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/>
                  </svg>
                </button>
              )}

              {models.length > 0 && (
                <button
                  onClick={() => { setDropdownOpen(o => !o); setBackdropOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px', borderRadius: 999,
                    background: modelFilter ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.12)',
                    border: `1px solid ${modelFilter ? 'rgba(139,92,246,0.45)' : 'rgba(139,92,246,0.25)'}`,
                    color: '#a78bfa', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="6" x2="20" y2="6"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                    <line x1="11" y1="18" x2="13" y2="18"/>
                  </svg>
                  <span>{modelFilter || 'Model'}</span>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                    <polyline points={dropdownOpen ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/>
                  </svg>
                </button>
              )}

            </div>
          )}
        </div>

        {/* дропдаун цвета фона */}
        {backdropOpen && (
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
              onClick={() => handleBackdropFilter(null)}
              style={{
                width: '100%', textAlign: 'left', padding: '11px 16px', fontSize: 13,
                color: !backdropFilter ? '#a78bfa' : 'rgba(255,255,255,0.55)',
                background: !backdropFilter ? 'rgba(139,92,246,0.1)' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: 'conic-gradient(#f59e0b, #50c878, #007fff, #bf00ff, #ff4040, #f59e0b)',
              }} />
              <span style={{ flex: 1 }}>All colors</span>
              {!backdropFilter && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
            {backdrops.map((b, i) => (
              <button
                key={b}
                onClick={() => handleBackdropFilter(b)}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 13,
                  color: backdropFilter === b ? '#a78bfa' : 'rgba(255,255,255,0.55)',
                  background: backdropFilter === b ? 'rgba(139,92,246,0.1)' : 'transparent',
                  borderBottom: i < backdrops.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: backdropCss(b),
                  border: '1.5px solid rgba(255,255,255,0.15)',
                  boxShadow: `0 0 6px ${backdropCss(b)}55`,
                }} />
                <span style={{ flex: 1 }}>{b}</span>
                {backdropFilter === b && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}

        {/* дропдаун моделей */}
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
                display: 'flex', alignItems: 'center',
              }}
            >
              <span style={{ flex: 1 }}>All models</span>
              {!modelFilter && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>

            {models.map((m, i) => (
              <button
                key={m.name}
                onClick={() => handleModelFilter(m.name)}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 13,
                  textTransform: 'capitalize',
                  color: modelFilter === m.name ? '#a78bfa' : 'rgba(255,255,255,0.55)',
                  background: modelFilter === m.name ? 'rgba(139,92,246,0.1)' : 'transparent',
                  borderBottom: i < models.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                {m.image
                  ? <img src={`https://ddejfvww7sqtk.cloudfront.net/images/attrs/${col.address}/${btoa(unescape(encodeURIComponent(m.name)))}.webp`} alt={m.name} style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} />
                  : <div style={{ width: 32, height: 32, flexShrink: 0 }} />
                }
                <span style={{ flex: 1 }}>{m.name}</span>
                {modelFilter === m.name && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 20px', gap: 32 }}>

            {/* terminal block */}
            <div style={{
              width: '100%', maxWidth: 280,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(139,92,246,0.15)',
              borderRadius: 14, padding: '16px 18px',
              fontFamily: 'monospace',
            }}>
              {/* title bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 6px #a78bfa', animation: 'termCursor 1.2s ease-in-out infinite' }}/>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.08em' }}>overwatch ~ scan</span>
              </div>

              {/* lines */}
              {[
                { text: '> Connecting to Fragment...', suffix: '✓', suffixColor: '#4ade80', delay: '0s' },
                { text: '> Connecting to GetGems...', suffix: '✓', suffixColor: '#4ade80', delay: '0.6s' },
                { text: '> Fetching listings...', suffix: null, delay: '1.2s' },
              ].map((line, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 11, marginBottom: 8,
                  opacity: 0, animation: `termLine 0.3s ${line.delay} forwards`,
                }}>
                  <span style={{ color: 'rgba(167,139,250,0.6)' }}>{line.text}</span>
                  {line.suffix
                    ? <span style={{ color: line.suffixColor, marginLeft: 8 }}>{line.suffix}</span>
                    : <span style={{ color: '#a78bfa', animation: 'termCursor 0.8s ease-in-out infinite' }}>█</span>
                  }
                </div>
              ))}
            </div>

            {/* hint */}
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.1)', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
              First load may take up to 30 sec<br/>while we scan all marketplaces
            </p>

            <style>{`
              @keyframes termLine {
                from { opacity: 0; transform: translateX(-6px); }
                to   { opacity: 1; transform: translateX(0); }
              }
              @keyframes termCursor {
                0%, 100% { opacity: 1; }
                50%       { opacity: 0; }
              }
            `}</style>
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 14, padding: '16px', color: '#f87171', fontSize: 13,
            display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', textAlign: 'center',
          }}>
            <span>Failed to load listings. Please try again.</span>
            <button
              onClick={() => {
                setError(null)
                setLoading(true)
                fetchListings({ collection: col.name, page, pageSize: PAGE_SIZE, model: modelFilter || undefined })
                  .then(data => { setItems(data.items); setTotal(data.total) })
                  .catch(e => setError(e.message))
                  .finally(() => setLoading(false))
              }}
              style={{
                padding: '7px 20px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171', cursor: 'pointer',
              }}
            >Try again</button>
          </div>
        )}

        {items && !loading && (
          <>
            {items.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No listings found</p>
              </div>
            ) : (
              items.map((item, i) => <ListingCard key={i} item={item} isBest={i === 0 && page === 1} />)
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
