// Состояния списка лотов: загрузка, ошибка, пусто, листалка страниц.
// (В8: вынесено из CollectionListings.jsx без изменений вёрстки)

export function LoadingTerminal() {
  return (
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
          { text: '> Connecting to MRKT...', suffix: '✓', suffixColor: '#4ade80', delay: '1.2s' },
          { text: '> Connecting to Portals...', suffix: '✓', suffixColor: '#4ade80', delay: '1.8s' },
          { text: '> Fetching listings...', suffix: null, delay: '2.4s' },
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
  )
}

export function LoadError({ onRetry }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: 14, padding: '16px', color: '#f87171', fontSize: 13,
      display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', textAlign: 'center',
    }}>
      <span>Failed to load listings. Please try again.</span>
      <button
        onClick={onRetry}
        style={{
          padding: '7px 20px', borderRadius: 999, fontSize: 12, fontWeight: 600,
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#f87171', cursor: 'pointer',
        }}
      >Try again</button>
    </div>
  )
}

export function EmptyList() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
      <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No listings found</p>
    </div>
  )
}

export function Pager({ page, totalPages, setPage }) {
  return (
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
  )
}
