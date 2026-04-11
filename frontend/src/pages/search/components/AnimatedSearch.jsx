import { useState, useRef } from 'react'
import './AnimatedSearch.css'

export default function AnimatedSearch({ value, onChange }) {
  const [expanded, setExpanded]   = useState(false)
  const [animating, setAnimating] = useState(false)
  const containerRef = useRef(null)
  const inputRef     = useRef(null)

  function start() {
    if (animating || expanded) return
    setAnimating(true)

    setTimeout(() => {
      setExpanded(true)
      setAnimating(false)
      inputRef.current?.focus()
    }, 400)
  }

  function reset() {
    setExpanded(false)
    setAnimating(false)
    onChange('')
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
        <button className="as-close" onClick={e => { e.stopPropagation(); reset() }}>
          ×
        </button>
      )}
    </div>
  )
}
