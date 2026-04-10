import { useState, useRef } from 'react'

export default function AnimatedSearch({ value, onChange }) {
  const [phase, setPhase]         = useState('idle')
  const [expanded, setExpanded]   = useState(false)
  const [inputVisible, setInputVisible] = useState(false)
  const [animating, setAnimating] = useState(false)
  const inputRef = useRef(null)

  function start() {
    if (phase !== 'idle') return
    setPhase('animating')
    setAnimating(true)

    setTimeout(() => {
      setExpanded(true)
      setTimeout(() => {
        setAnimating(false)
        setInputVisible(true)
        setPhase('open')
        inputRef.current?.focus()
      }, 320)
    }, 80)
  }

  function reset() {
    setPhase('idle')
    setExpanded(false)
    setInputVisible(false)
    setAnimating(false)
    onChange('')
  }

  return (
    <div style={{ position: 'relative', display: 'flex', width: expanded ? '100%' : 40, flexShrink: 0, transition: 'width 320ms cubic-bezier(0.4,0,0.2,1)', willChange: 'width' }}>

      {/* Вращающаяся дуга по периметру */}
      {!expanded && (
        <svg
          width="46" height="46"
          viewBox="0 0 46 46"
          className="spin-arc"
          style={{ position: 'absolute', top: -4, left: -4, pointerEvents: 'none', willChange: 'transform' }}
        >
          <circle
            cx="23" cy="23" r="21"
            fill="none"
            stroke="#a78bfa"
            strokeWidth="0.8"
            strokeDasharray="30 102"
            strokeLinecap="round"
            opacity="0.8"
          />
        </svg>
      )}

      <div
        onClick={phase === 'idle' ? start : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: expanded ? 'flex-start' : 'center',
          width: '100%',
          height: 38,
          borderRadius: expanded ? 9999 : '50%',
          background: 'rgba(255,255,255,0.08)',
          // blur только когда не анимируется
          backdropFilter: animating ? 'none' : 'blur(16px)',
          WebkitBackdropFilter: animating ? 'none' : 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.12)',
          overflow: 'visible',
          cursor: phase === 'idle' ? 'pointer' : 'default',
          color: '#a78bfa',
          padding: expanded ? '0 14px 0 4px' : 0,
          transition: 'border-radius 320ms cubic-bezier(0.4,0,0.2,1), padding 320ms cubic-bezier(0.4,0,0.2,1)',
          flexShrink: 0,
          willChange: 'border-radius',
          transform: 'translateZ(0)',
        }}
      >
        {/* Лупа */}
        <svg
          width="23" height="23"
          viewBox="0 0 24 24"
          style={{
            flexShrink: 0,
            transformOrigin: 'center',
            marginTop: 1,
            transform: animating ? 'scale(1.2) rotate(-20deg)' : 'scale(1) rotate(0deg)',
            transition: animating
              ? 'transform 150ms cubic-bezier(0.4,0,0.2,1)'
              : 'transform 200ms cubic-bezier(0.4,0,0.2,1)',
            willChange: 'transform',
          }}
        >
          <circle cx="9.5" cy="9.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path
            d="M15.5 15.5 L21 21"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            style={{
              opacity: expanded ? 0 : 1,
              transition: 'opacity 150ms ease',
            }}
          />
        </svg>

        {/* Поле ввода */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Filter collections..."
          style={{
            flex: inputVisible ? 1 : 0,
            width: inputVisible ? 'auto' : 0,
            marginLeft: inputVisible ? 8 : 0,
            opacity: inputVisible ? 1 : 0,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 15,
            color: '#a78bfa',
            transition: 'opacity 180ms ease',
          }}
        />

        {/* Крестик */}
        {inputVisible && (
          <button
            onClick={e => { e.stopPropagation(); reset() }}
            style={{
              background: 'none',
              border: 'none',
              color: '#a78bfa',
              cursor: 'pointer',
              fontSize: 20,
              lineHeight: 1,
              padding: '0 2px',
              flexShrink: 0,
            }}
          >×</button>
        )}
      </div>
    </div>
  )
}
