import { useNavigate } from 'react-router-dom'

export default function Themes() {
  const navigate = useNavigate()

  return (
    <div style={{
      position: 'relative', height: '100svh',
      background: '#06030f',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>

      {/* Purple orb — top left */}
      <div style={{
        position: 'absolute', top: '-18%', left: '-22%',
        width: 480, height: 480, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(109,40,217,0.28) 0%, transparent 65%)',
        filter: 'blur(65px)',
        animation: 'floatA 11s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Cyan orb — bottom right, large */}
      <div style={{
        position: 'absolute', bottom: '-15%', right: '-20%',
        width: 520, height: 520, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(3,105,161,0.45) 0%, transparent 65%)',
        filter: 'blur(60px)',
        animation: 'floatB 14s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Cyan orb — center bottom */}
      <div style={{
        position: 'absolute', bottom: '10%', left: '20%',
        width: 320, height: 320, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(14,116,144,0.3) 0%, transparent 65%)',
        filter: 'blur(50px)',
        animation: 'floatC 9s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Dot grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.016) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
        pointerEvents: 'none',
      }} />

      {/* Back */}
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

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 10,
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-start',
        padding: '240px 24px 0',
      }}>

        {/* Title */}
        <h1 style={{
          fontSize: 58, fontWeight: 900, margin: 0,
          letterSpacing: '-4px', lineHeight: 0.88,
          textAlign: 'center',
          background: 'linear-gradient(150deg, #ffffff 0%, #bae6fd 40%, #38bdf8 75%, #0284c7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'fadeUp 0.5s 0s both, glow 5s ease-in-out infinite',
        }}>
          THEMES
        </h1>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 100, padding: '5px 12px',
          marginTop: 16,
          animation: 'fadeUp 0.5s 0.08s both',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316', boxShadow: '0 0 6px #f97316' }} />
          <span style={{ fontSize: 11, color: '#52525b', letterSpacing: '0.05em' }}>IN PROGRESS</span>
        </div>

        {/* Subtitle */}
        <p style={{
          color: 'rgba(196,181,253,0.4)',
          fontSize: 11, margin: '18px 0 0',
          letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 500,
          animation: 'fadeUp 0.5s 0.15s both',
        }}>
          hand-picked gift sets
        </p>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          marginTop: 52,
          animation: 'fadeUp 0.5s 0.25s both',
        }}>
          <div style={{ height: 1, width: 60, background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3))' }} />
          <span style={{ fontSize: 10, color: 'rgba(139,92,246,0.4)', letterSpacing: '0.2em', fontWeight: 500 }}>
            WORK IN PROGRESS
          </span>
          <div style={{ height: 1, width: 60, background: 'linear-gradient(270deg, transparent, rgba(139,92,246,0.3))' }} />
        </div>

        {/* Coming soon */}
        <p style={{
          marginTop: 16,
          fontSize: 13, color: 'rgba(196,181,253,0.38)',
          textAlign: 'center', lineHeight: 1.7,
          animation: 'fadeUp 0.5s 0.32s both',
        }}>
          We're building curated gift collections.<br />
          <span style={{ color: 'rgba(139,92,246,0.3)' }}>Coming soon.</span>
        </p>

      </div>

      <style>{`
        @keyframes floatA {
          0%, 100% { transform: translate(0, 0); }
          50%       { transform: translate(40px, 30px); }
        }
        @keyframes floatB {
          0%, 100% { transform: translate(0, 0); }
          50%       { transform: translate(-30px, -20px); }
        }
        @keyframes floatC {
          0%, 100% { transform: translate(0, 0); }
          50%       { transform: translate(20px, -15px); }
        }
        @keyframes ping {
          0%   { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes glow {
          0%, 100% { filter: drop-shadow(0 0 35px rgba(56,189,248,0.4)); }
          50%       { filter: drop-shadow(0 0 65px rgba(56,189,248,0.7)); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
