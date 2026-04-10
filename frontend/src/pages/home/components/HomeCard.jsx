export default function HomeCard({ card, position, onClick }) {
  return (
    <div
      className={`carousel-card ${position}`}
      onClick={onClick}
      style={{
        background: card.bg,
        border: `1px solid ${card.border}`,
        boxShadow: position === 'active'
          ? `0 0 60px ${card.glow}, 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)`
          : 'none',
      }}
    >
      {/* визуал на фоне карточки (радар, сетка и т.д.) */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.7 }}>
        {card.visual}
      </div>

      {/* градиентный оверлей снизу */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(to top, ${card.bg} 0%, transparent 50%)`,
      }}/>

      {/* контент: иконка, тег, заголовок, описание */}
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
