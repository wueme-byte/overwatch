export default function ListingCard({ item, isBest }) {
  const isFragment = item.marketplace === 'Fragment'
  const isAuction = isFragment && item.attributes?.fragment_status === 'On auction'
  const accentColor = isFragment ? 'rgba(251,191,36,0.5)' : 'rgba(56,189,248,0.5)'
  const badgeBg     = isFragment ? 'rgba(251,191,36,0.08)' : 'rgba(56,189,248,0.08)'
  const badgeColor  = isFragment ? '#fbbf24' : '#7dd3fc'
  const badgeBorder = isFragment ? 'rgba(251,191,36,0.18)' : 'rgba(56,189,248,0.18)'

  return (
    <a
      href={item.listing_url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px 12px 16px',
        borderRadius: 16,
        background: isBest
          ? 'linear-gradient(135deg, rgba(109,40,217,0.18) 0%, rgba(139,92,246,0.08) 100%)'
          : 'rgba(255,255,255,0.03)',
        border: isBest
          ? '1px solid rgba(139,92,246,0.3)'
          : '1px solid rgba(255,255,255,0.07)',
        borderLeft: `3px solid ${accentColor}`,
        textDecoration: 'none',
        transition: 'background 150ms ease, transform 100ms ease',
        WebkitTapHighlightColor: 'transparent',
      }}
      onTouchStart={e => e.currentTarget.style.background = isBest ? 'rgba(109,40,217,0.25)' : 'rgba(255,255,255,0.06)'}
      onTouchEnd={e => e.currentTarget.style.background = isBest ? 'linear-gradient(135deg, rgba(109,40,217,0.18) 0%, rgba(139,92,246,0.08) 100%)' : 'rgba(255,255,255,0.03)'}
    >
      {/* left: name + model */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#ffffff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: 3,
        }}>{item.name}</p>
        <p style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.3)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{item.model}</p>
      </div>

      {/* right: price + badge */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.3px' }}>
            {Number(item.price_ton).toFixed(2)}
          </span>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(125,211,252,0.7)' }}>TON</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {isBest && (
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 999,
              background: 'linear-gradient(90deg, rgba(109,40,217,0.35) 0%, rgba(139,92,246,0.2) 100%)',
              color: '#c4b5fd',
              border: '1px solid rgba(139,92,246,0.45)',
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
            }}>Best Price</span>
          )}
          {isAuction && (
            <span style={{
              fontSize: 10,
              fontWeight: 500,
              padding: '2px 7px',
              borderRadius: 999,
              background: 'rgba(168,85,247,0.1)',
              color: '#c084fc',
              border: '1px solid rgba(168,85,247,0.25)',
            }}>Auction</span>
          )}
          <span style={{
            fontSize: 10,
            fontWeight: 500,
            padding: '2px 7px',
            borderRadius: 999,
            background: badgeBg,
            color: badgeColor,
            border: `1px solid ${badgeBorder}`,
          }}>{item.marketplace}</span>
        </div>
      </div>

      <button
        onClick={e => {
          e.preventDefault()
          e.stopPropagation()
          const url = `https://t.me/nft/${item.name.replace(/[\s']/g, '').replace('#', '-')}`
          if (window.Telegram?.WebApp?.openTelegramLink) {
            window.Telegram.WebApp.openTelegramLink(url)
          } else {
            window.open(url)
          }
        }}
        style={{
          position: 'absolute',
          left: '27%',
          top: '68%',
          transform: 'translateY(-50%)',
          width: 24, height: 24,
          borderRadius: '50%',
          background: 'linear-gradient(145deg, rgba(139,92,246,0.25) 0%, rgba(109,40,217,0.1) 100%)',
          border: '1px solid rgba(139,92,246,0.4)',
          boxShadow: '0 0 8px rgba(139,92,246,0.3), 0 2px 4px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(196,181,253,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
    </a>
  )
}
