import { useNavigate } from 'react-router-dom'

export default function Themes() {
  const navigate = useNavigate()

  return (
    <div style={{ position: 'relative', height: '100svh', background: '#080808', overflow: 'hidden' }}>

      {/* CRT scanlines */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 5,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px)',
        pointerEvents: 'none',
      }} />

      {/* vignette */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 6,
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)',
        pointerEvents: 'none',
      }} />

      {/* back */}
      <button
        onClick={() => navigate(-1)}
        style={{
          position: 'absolute', top: 152, left: 16, zIndex: 20,
          width: 32, height: 32, borderRadius: '50%',
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

      {/* center */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 28,
      }}>
        <pre style={{
          fontFamily: 'monospace',
          fontSize: 14,
          lineHeight: 1.6,
          color: '#c4b5fd',
          margin: 0,
          textAlign: 'center',
          animation: 'glitch 6s ease-in-out infinite',
          userSelect: 'none',
        }}>{
`  ◆ ━━━━━━━━━━━━━━━━━ ◆
  ┃                   ┃
  ┃  ✦   T H E M E S  ✦  ┃
  ┃                   ┃
  ◆ ━━━━━━━━━━━━━━━━━ ◆
        ◆   ◈   ◆
      ◈   ◆   ◆   ◈
        ◆   ◈   ◆`
        }</pre>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11,
            color: 'rgba(167,139,250,0.5)',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            animation: 'fade 2s ease-in-out infinite',
          }}>Coming Soon</span>
          <span style={{
            fontSize: 14,
            color: 'rgba(167,139,250,0.6)',
            animation: 'blink 1.2s step-end infinite',
          }}>▌</span>
        </div>
      </div>

      <style>{`
        @keyframes glitch {
          0%, 85%, 100% {
            text-shadow: 0 0 18px rgba(139,92,246,0.7);
            opacity: 0.85;
          }
          50% {
            text-shadow: 0 0 36px rgba(139,92,246,1), 0 0 70px rgba(109,40,217,0.5);
            opacity: 1;
          }
          87% {
            text-shadow: -3px 0 rgba(255,0,200,0.7), 3px 0 rgba(0,200,255,0.7), 0 0 30px rgba(139,92,246,0.8);
            transform: translateX(-2px);
          }
          89% {
            text-shadow: 3px 0 rgba(255,0,200,0.7), -3px 0 rgba(0,200,255,0.7), 0 0 30px rgba(139,92,246,0.8);
            transform: translateX(2px);
          }
          91% {
            text-shadow: 0 0 18px rgba(139,92,246,0.7);
            transform: translateX(0);
          }
        }
        @keyframes fade {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.75; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
