import { useState, useRef } from 'react'

export default function AnimatedSearch({ value, onChange }) {
  const [phase, setPhase]             = useState('idle')
  const [svgTransform, setSvgTransform] = useState('rotate(0deg) scale(1)')
  const [svgTransition, setSvgTransition] = useState('transform 400ms cubic-bezier(0.4,0,0.2,1)')
  const [lensTransform, setLensTransform] = useState('rotateY(0deg)')
  const [dashOffset, setDashOffset]   = useState('0')
  const [expanded, setExpanded]       = useState(false)
  const [inputVisible, setInputVisible] = useState(false)
  const inputRef = useRef(null)

  function start() {
    if (phase !== 'idle') return
    setPhase('animating')

    // 1. Ручка поворачивается вниз (-45°)
    setSvgTransition('transform 400ms cubic-bezier(0.4,0,0.2,1)')
    setSvgTransform('rotate(-45deg)')

    // 2. Увеличение в 3x
    setTimeout(() => {
      setSvgTransition('transform 280ms cubic-bezier(0.4,0,0.2,1)')
      setSvgTransform('rotate(-45deg) scale(1.5)')
    }, 180)

    // 3. Обороты линзы + ручка исчезает
    setTimeout(() => {
      setLensTransform('rotateY(720deg)')
      setDashOffset('7.78')

      // 4. На втором обороте — возврат в нормальный размер + расширение контейнера
      setTimeout(() => {
        setSvgTransition('transform 420ms cubic-bezier(0.4,0,0.2,1)')
        setSvgTransform('rotate(0deg) scale(1)')
        setExpanded(true)

        setTimeout(() => {
          setInputVisible(true)
          setPhase('open')
          inputRef.current?.focus()
        }, 150)
      }, 350)
    }, 380)
  }

  function reset() {
    setPhase('idle')
    setExpanded(false)
    setInputVisible(false)
    setSvgTransition('transform 300ms ease')
    setSvgTransform('rotate(0deg) scale(1)')
    setLensTransform('rotateY(0deg)')
    setDashOffset('0')
    onChange('')
  }

  return (
    <div style={{ position: 'relative', display: 'flex', width: expanded ? '100%' : 40, flexShrink: 0 }}>

      {/* Вращающаяся дуга по периметру */}
      {!expanded && (
        <svg
          width="46" height="46"
          viewBox="0 0 46 46"
          className="spin-arc"
          style={{ position: 'absolute', top: -4, left: -4, pointerEvents: 'none' }}
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
        width: expanded ? '88%' : 38,
        height: 38,
        borderRadius: expanded ? 9999 : '50%',
         background: 'rgba(255,255,255,0.08)',
         backdropFilter: 'blur(16px)',
         WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.12)',
        overflow: 'visible',
        cursor: phase === 'idle' ? 'pointer' : 'default',
        color: '#a78bfa',
        padding: expanded ? '0 14px 0 4px' : 0,
        transition: 'width 420ms cubic-bezier(0.4,0,0.2,1), border-radius 420ms cubic-bezier(0.4,0,0.2,1), padding 420ms cubic-bezier(0.4,0,0.2,1)',
        flexShrink: 0,
      }}
    >
      {/* Лупа — остаётся иконкой слева после раскрытия */}
      <svg
        width="23" height="23"
        viewBox="0 0 24 24"
        style={{
          flexShrink: 0,
          transform: svgTransform,
          transition: svgTransition,
          transformOrigin: 'center',
          marginTop: 1,
        }}
      >
        <g style={{
          transform: lensTransform,
          transition: 'transform 820ms cubic-bezier(0.25,0.1,0.25,1)',
          transformOrigin: 'center',
        }}>
          <circle cx="9.5" cy="9.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
        </g>
        <path
          d="M15.5 15.5 L21 21"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          style={{
            strokeDasharray: '7.78',
            strokeDashoffset: dashOffset,
            transition: 'stroke-dashoffset 320ms cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </svg>

      {/* Поле ввода — появляется внутри раскрывшейся лупы */}
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
          transition: 'opacity 200ms ease, margin-left 300ms cubic-bezier(0.4,0,0.2,1)',
        }}
      />

      {/* Крестик — закрыть */}
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
