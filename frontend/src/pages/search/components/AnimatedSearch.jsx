import { useState, useRef } from 'react'
import './AnimatedSearch.css'

export default function AnimatedSearch({ value, onChange }) {
  const [expanded, setExpanded]   = useState(false)
  const [animating, setAnimating] = useState(false)
  const svgRef    = useRef(null)
  const lensRef   = useRef(null)
  const handleRef = useRef(null)
  const inputRef  = useRef(null)

  function start() {
    if (animating || expanded) return
    setAnimating(true)

    // 1. Поворот ручки вниз
    svgRef.current.style.transform = 'rotate(-45deg)'

    // 2. Быстрое увеличение ×3
    setTimeout(() => {
      svgRef.current.style.transform = 'rotate(-45deg) scale(1.5)'
    }, 400)

    // 3. Обороты линзы + исчезновение ручки
    setTimeout(() => {
      lensRef.current.style.transform = 'rotateY(720deg)'
      handleRef.current.style.strokeDashoffset = '7.78'

      // Раскрываем в поисковое поле
      setTimeout(() => {
        svgRef.current.style.transform = 'rotate(0deg) scale(1)'
        setExpanded(true)
        setAnimating(false)
        inputRef.current?.focus()
      }, 400)
    }, 700)
  }

  function reset() {
    setExpanded(false)
    setAnimating(false)
    if (svgRef.current)    svgRef.current.style.transform = ''
    if (lensRef.current)   lensRef.current.style.transform = ''
    if (handleRef.current) handleRef.current.style.strokeDashoffset = '0'
    onChange('')
  }

  return (
    <div
      className={`as-container${expanded ? ' as-expanded' : ''}`}
      onClick={!expanded && !animating ? start : undefined}
    >
      <svg ref={svgRef} className="as-svg" width="22" height="22" viewBox="0 0 24 24">
        <g ref={lensRef} className="as-lens">
          <circle cx="9.5" cy="9.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2"/>
        </g>
        <path
          ref={handleRef}
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
