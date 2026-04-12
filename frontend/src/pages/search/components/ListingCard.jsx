export default function ListingCard({ item }) {
  const isFragment = item.marketplace === 'Fragment'
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
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px 12px 16px',
        borderRadius: 16,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderLeft: `3px solid ${accentColor}`,
        textDecoration: 'none',
        transition: 'background 150ms ease, transform 100ms ease',
        WebkitTapHighlightColor: 'transparent',
      }}
      onTouchStart={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
      onTouchEnd={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
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
    </a>
  )
}
