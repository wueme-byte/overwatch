export default function HomeCard({ card, position, dragOffset, isTouching, onClick }) {
  const dragging = dragOffset !== 0
  const pressing = isTouching && !dragging

  // live transform во время перетаскивания
  let liveTransform = null
  let liveTransition = null

  if (dragging) {
    liveTransition = 'none'
    if (position === 'active') {
      liveTransform = `translateX(${dragOffset}px) rotateY(0deg) scale(1)`
    } else if (position === 'next') {
      liveTransform = `translateX(calc(68% + ${dragOffset}px)) rotateY(-28deg) scale(0.82)`
    } else {
      liveTransform = `translateX(calc(-68% + ${dragOffset}px)) rotateY(28deg) scale(0.82)`
    }
  }

  const isActive = position === 'active'

  const boxShadow = isActive
    ? pressing
      ? `0 0 80px ${card.glow}, 0 0 30px ${card.border}, 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)`
      : `0 0 60px ${card.glow}, 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)`
    : 'none'

  return (
    <div
      className={`carousel-card ${position}`}
      onClick={onClick}
      style={{
        background: card.bg,
        border: pressing && isActive
          ? `1px solid ${card.color2}`
          : `1px solid ${card.border}`,
        boxShadow,
        ...(liveTransform ? { transform: liveTransform } : {}),
        ...(liveTransition ? { transition: liveTransition } : {}),
      }}
    >
      {/* визуал на фоне */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.7 }}>
        {card.visual}
      </div>

      {/* градиентный оверлей снизу */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(to top, ${card.bg} 0%, transparent 50%)`,
      }}/>

      {/* контент */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 22px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${card.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: card.color2,
          }}>
            {card.icon}
          </div>
          <span style={{ fontSize: 10, color: card.color2, letterSpacing: '0.08em', fontWeight: 600 }}>
            {card.tag}
          </span>
        </div>

        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', marginBottom: 6 }}>
          {card.title}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
          {card.description}
        </div>
      </div>
    </div>
  )
}
