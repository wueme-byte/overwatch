export default function DesktopBlock() {
  return (
    <div style={{
      background: '#080808',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* orbs */}
      <div style={{
        position: 'absolute', top: '-15%', left: '-10%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(109,40,217,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>
      <div style={{
        position: 'absolute', bottom: '-10%', right: '-10%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(3,105,161,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>
      {/* dot grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        pointerEvents: 'none',
      }}/>

      {/* content */}
      <div style={{ position: 'relative', textAlign: 'center' }}>
        {/* radar icon */}
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: 24, opacity: 0.6 }}>
          <circle cx="24" cy="24" r="22" stroke="rgba(139,92,246,0.4)" strokeWidth="1"/>
          <circle cx="24" cy="24" r="14" stroke="rgba(139,92,246,0.3)" strokeWidth="1"/>
          <circle cx="24" cy="24" r="6"  stroke="rgba(139,92,246,0.4)" strokeWidth="1"/>
          <line x1="24" y1="24" x2="24" y2="2"  stroke="rgba(139,92,246,0.5)" strokeWidth="1"/>
          <line x1="24" y1="24" x2="46" y2="24" stroke="rgba(139,92,246,0.3)" strokeWidth="1"/>
          <circle cx="32" cy="14" r="2" fill="#a78bfa" opacity="0.7"/>
        </svg>

        <p style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '3px',
          color: 'rgba(139,92,246,0.6)',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}>OVERWATCH</p>

        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-0.5px',
          background: 'linear-gradient(135deg, #ffffff 40%, #a78bfa 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 12,
          lineHeight: 1.2,
        }}>Mobile only.</h1>

        <p style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.35)',
          lineHeight: 1.6,
        }}>Open via Telegram on your phone.</p>
      </div>
    </div>
  )
}
