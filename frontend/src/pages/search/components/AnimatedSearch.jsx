import { useState, useRef } from 'react'
import './AnimatedSearch.css'

export default function AnimatedSearch({ value, onChange }) {
  const [expanded, setExpanded]   = useState(false)
  const [animating, setAnimating] = useState(false)
  const [closing, setClosing]     = useState(false)
  const containerRef = useRef(null)
  const inputRef     = useRef(null)

  function start() {
    if (animating || expanded) return
    setAnimating(true)

    setTimeout(() => {
      setExpanded(true)
      setAnimating(false)
      inputRef.current?.focus()
    }, 650)
  }

  function reset() {
    setExpanded(false)
    setAnimating(false)
    setClosing(false)
    onChange('')
  }

  function handleClose(e) {
    e.stopPropagation()
    setClosing(true)
    setTimeout(reset, 180)
  }

  return (
    <div
      ref={containerRef}
      className={`as-container${animating ? ' as-animating' : ''}${expanded ? ' as-expanded' : ''}`}
      onClick={!expanded && !animating ? start : undefined}
    >
      <svg className="as-svg" width="22" height="22" viewBox="0 0 24 24">
        <g className="as-lens">
          <circle cx="9.5" cy="9.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2"/>
        </g>
        <path
          d="M15.5 15.5 L21 21"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          className="as-handle"
        />
      </svg>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Filter collections..."
        className="as-input"
      />

      {expanded && (
        <button
          className={`as-close${closing ? ' as-close-exit' : ''}`}
          onAnimationEnd={e => {
            if (e.animationName === 'closeAppear') {
              e.currentTarget.style.animation = 'none'
            }
          }}
          onClick={handleClose}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            <line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}
