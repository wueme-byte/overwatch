import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { pepePaths, capPaths, bunnyPaths } from '../../assets/giftPaths'
import HomeCard from './components/HomeCard'

/* ── icons ─────────────────────────────────────────────── */
const GiftIcon = () => (
  <svg width="22" height="22" viewBox="0 0 15 15" fill="currentColor">
    <path d="M6.5,5v2H0V5H6.5z M8.5,5v2H15V5H8.5z M1,8v4.5C1,13.3284,1.6716,14,2.5,14h4V8H1z M8.5,8v6h4c0.8284,0,1.5-0.6716,1.5-1.5V8H8.5z M10.5,0c-1.4033-0.0444-2.6497,0.8904-3,2.25C7.1497,0.8904,5.9033-0.0444,4.5,0c-1.0709-0.0337-1.9663,0.8072-2,1.8781C2.4987,1.9187,2.4987,1.9594,2.5,2C2.3443,2.9427,2.9822,3.8331,3.9249,3.9888C4.0853,4.0153,4.2486,4.0191,4.41,4h6.13c0.9548,0.1497,1.8503-0.5029,2-1.4577c0.0282-0.1797,0.0282-0.3626,0-0.5423c0.0002-1.1046-0.895-2.0002-1.9996-2.0004C10.5269-0.0004,10.5135-0.0003,10.5,0z M4.5,3c-0.506,0.0463-0.9537-0.3264-1-0.8323C3.4949,2.1119,3.4949,2.0558,3.5,2C3.4537,1.494,3.8264,1.0463,4.3323,1C4.3881,0.9949,4.4442,0.9949,4.5,1c1.1046,0,2,0.8954,2,2H4.5z M10.5,3h-2c0-1.1046,0.8954-2,2-2c0.5523,0,1,0.4477,1,1c0.0463,0.506-0.3264,0.9537-0.8323,1C10.6119,3.0051,10.5558,3.0051,10.5,3z"/>
  </svg>
)

const SearchIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

const ThemeIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
)

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)


/* ── data ───────────────────────────────────────────────── */
const cards = [
  {
    id: 'search', title: 'Search', path: '/search',
    description: 'Find the best price across GetGems & Fragment by collection or model',
    icon: <SearchIcon />, tag: 'Collection · Model · Price',
    color1: '#7c3aed', color2: '#a78bfa',
    bg: 'linear-gradient(145deg, #110822 0%, #0d0520 60%, #080410 100%)',
    border: 'rgba(139,92,246,0.25)',
    glow: 'rgba(109,40,217,0.35)',
    visual: (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 30%, rgba(109,40,217,0.35) 0%, transparent 70%)',
        }}/>

        {/* search results preview */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          viewBox="0 0 240 180" preserveAspectRatio="xMidYMid meet" style={{transform:'scale(0.82)', transformOrigin:'center top'}}>
          <defs>
            <filter id="rowGlow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* card container */}
          <rect x="20" y="12" width="200" height="110" rx="12"
            fill="rgba(15,5,40,0.6)" stroke="rgba(139,92,246,0.15)" strokeWidth="1"/>

          {/* header row */}
          <rect x="32" y="22" width="60" height="6" rx="3" fill="rgba(167,139,250,0.25)"/>
          <rect x="100" y="22" width="40" height="6" rx="3" fill="rgba(167,139,250,0.12)"/>
          <rect x="170" y="22" width="36" height="6" rx="3" fill="rgba(167,139,250,0.12)"/>

          {/* divider */}
          <line x1="32" y1="36" x2="208" y2="36" stroke="rgba(139,92,246,0.1)" strokeWidth="0.8"/>

          {/* row 1 — highlighted (best match) */}
          <rect x="20" y="38" width="200" height="24" rx="0"
            fill="rgba(109,40,217,0.2)" filter="url(#rowGlow)">
            <animate attributeName="opacity" values="0.8;1;0.8" dur="2.5s" repeatCount="indefinite"/>
          </rect>
          <rect x="20" y="38" width="200" height="24" rx="0"
            fill="none" stroke="rgba(167,139,250,0.2)" strokeWidth="0"/>
          {/* left dot — active */}
          <circle cx="32" cy="50" r="3.5" fill="#a78bfa" filter="url(#rowGlow)">
            <animate attributeName="opacity" values="1;0.5;1" dur="2.5s" repeatCount="indefinite"/>
          </circle>
          <rect x="42" y="46" width="55" height="5" rx="2.5" fill="rgba(221,214,254,0.8)"/>
          <rect x="42" y="53" width="30" height="3.5" rx="1.8" fill="rgba(167,139,250,0.4)"/>
          <rect x="162" y="47" width="46" height="7" rx="3.5" fill="rgba(167,139,250,0.7)"/>

          {/* row 2 */}
          <circle cx="32" cy="74" r="2.5" fill="rgba(139,92,246,0.3)"/>
          <rect x="42" y="70" width="45" height="4.5" rx="2" fill="rgba(255,255,255,0.15)"/>
          <rect x="42" y="76" width="28" height="3" rx="1.5" fill="rgba(255,255,255,0.07)"/>
          <rect x="168" y="71" width="38" height="6" rx="3" fill="rgba(255,255,255,0.1)"/>

          {/* row 3 */}
          <circle cx="32" cy="98" r="2.5" fill="rgba(139,92,246,0.3)"/>
          <rect x="42" y="94" width="50" height="4.5" rx="2" fill="rgba(255,255,255,0.12)"/>
          <rect x="42" y="100" width="22" height="3" rx="1.5" fill="rgba(255,255,255,0.06)"/>
          <rect x="165" y="95" width="42" height="6" rx="3" fill="rgba(255,255,255,0.08)"/>

          {/* dividers between rows */}
          <line x1="32" y1="62" x2="208" y2="62" stroke="rgba(139,92,246,0.07)" strokeWidth="0.6"/>
          <line x1="32" y1="86" x2="208" y2="86" stroke="rgba(139,92,246,0.07)" strokeWidth="0.6"/>

          {/* "best price" badge on row 1 */}
          <rect x="104" y="43" width="48" height="13" rx="4"
            fill="rgba(109,40,217,0.5)" stroke="rgba(167,139,250,0.4)" strokeWidth="0.8">
            <animate attributeName="opacity" values="0.9;0.5;0.9" dur="2.5s" repeatCount="indefinite"/>
          </rect>
          <text x="128" y="52.5" textAnchor="middle" fontSize="6.5"
            fill="#ddd6fe" fontFamily="system-ui" fontWeight="600" letterSpacing="0.3">
            BEST PRICE
          </text>
        </svg>
      </div>
    ),
  },
  {
    id: 'themes', title: 'Themes', path: '/themes',
    description: 'Curated gift sets grouped by topic — BTC, Pokemon, America and more',
    icon: <ThemeIcon />, tag: 'BTC · Pokemon · America · Ladybug',
    color1: '#0369a1', color2: '#38bdf8',
    bg: 'linear-gradient(145deg, #041422 0%, #030e1a 60%, #020810 100%)',
    border: 'rgba(56,189,248,0.2)',
    glow: 'rgba(3,105,161,0.35)',
    visual: (
      <svg width="100%" height="55%" viewBox="0 0 240 140" preserveAspectRatio="xMidYMid meet" style={{position:'absolute', top:0, left:0}}>
        <defs>
        </defs>

        {/* connections */}
        {[
          [40,30,120,20],[120,20,200,40],[40,30,60,90],[120,20,140,75],
          [200,40,210,100],[60,90,140,75],[140,75,210,100],[60,90,90,120],
          [140,75,170,125],[90,120,170,125],[30,115,60,90]
        ].map(([x1,y1,x2,y2],i)=>(
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="rgba(56,189,248,0.15)" strokeWidth="0.8"/>
        ))}

        {/* on-path nodes */}
        {[
          { cx:120, cy:20,  t:1.06 },
          { cx:210, cy:100, t:2.94 },
          { cx:90,  cy:120, t:4.61 },
          { cx:60,  cy:90,  t:5.17 },
        ].map((n,i)=>(
          <g key={i}>
            {/* base dot */}
            <circle cx={n.cx} cy={n.cy} r="2" fill="#38bdf8" opacity="0.4">
              <animate attributeName="opacity" values="0.4;1;0.4" keyTimes="0;0.06;1" dur="6s" begin={`${n.t}s`} repeatCount="indefinite"/>
              <animate attributeName="fill" values="#38bdf8;#e0f2fe;#38bdf8" keyTimes="0;0.06;1" dur="6s" begin={`${n.t}s`} repeatCount="indefinite"/>
            </circle>
            {/* expanding ring — без фильтров */}
            <circle cx={n.cx} cy={n.cy} r="2" fill="none" stroke="#7dd3fc" strokeWidth="0.8" opacity="0">
              <animate attributeName="r"       values="2;10;10"  keyTimes="0;0.12;1" dur="6s" begin={`${n.t}s`} repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0;0.6;0"  keyTimes="0;0.04;0.2" dur="6s" begin={`${n.t}s`} repeatCount="indefinite"/>
            </circle>
          </g>
        ))}

        {/* off-path nodes */}
        <circle cx="140" cy="75" r="2" fill="#38bdf8" opacity="0.3">
          <animate attributeName="opacity" values="0.3;0.6;0.3" dur="4s" repeatCount="indefinite"/>
        </circle>
        <circle cx="30" cy="115" r="2" fill="#38bdf8" opacity="0.3">
          <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite"/>
        </circle>

        {/* dot at (40,30) — скрывается когда появляется bunny (t=0/6s, начало петли) */}
        <circle cx="40" cy="30" r="2" fill="#38bdf8" opacity="0.4">
          <animate attributeName="opacity" values="0;0.4;0.4;1"
            keyTimes="0;0.083;0.167;1" dur="6s" repeatCount="indefinite"/>
        </circle>
        {/* expanding ring at (40,30) */}
        <circle cx="40" cy="30" r="2" fill="none" stroke="#7dd3fc" strokeWidth="0.8" opacity="0">
          <animate attributeName="r"       values="2;10;10"  keyTimes="0;0.12;1" dur="6s" begin="0s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0;0.6;0"  keyTimes="0;0.04;0.2" dur="6s" begin="0s" repeatCount="indefinite"/>
        </circle>

        {/* bunny silhouette — появляется когда лупа в (40,30) при t=0/6s */}
        <g transform="translate(40,30) scale(0.021) translate(-1028,-574)" fill="#38bdf8" opacity="0">
          <animate attributeName="opacity" values="0.9;0.9;0;0"
            keyTimes="0;0.083;0.167;1" dur="6s" repeatCount="indefinite"/>
          {bunnyPaths.map((d,i) => <path key={i} d={d}/>)}
        </g>

        {/* dot at (200,40) — скрывается когда лупа проходит и появляется силуэт */}
        <circle cx="200" cy="40" r="2" fill="#38bdf8" opacity="0.4">
          <animate attributeName="opacity" values="0.4;0.4;0;0;0.4;0.4"
            keyTimes="0;0.317;0.383;0.617;0.733;1" dur="6s" repeatCount="indefinite"/>
        </circle>
        {/* expanding ring at (200,40) */}
        <circle cx="200" cy="40" r="2" fill="none" stroke="#7dd3fc" strokeWidth="0.8" opacity="0">
          <animate attributeName="r"       values="2;10;10"  keyTimes="0;0.12;1" dur="6s" begin="2.14s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0;0.6;0"  keyTimes="0;0.04;0.2" dur="6s" begin="2.14s" repeatCount="indefinite"/>
        </circle>

        {/* gift silhouette — появляется когда лупа проходит через (200,40) в t=2.14s */}
        <g transform="translate(200,40) scale(0.044) translate(-590,-414)" fill="#38bdf8" opacity="0">
          <animate attributeName="opacity" values="0;0;0.9;0.9;0;0"
            keyTimes="0;0.317;0.383;0.617;0.733;1" dur="6s" repeatCount="indefinite"/>
          {pepePaths.map((d,i) => <path key={i} d={d}/>)}
        </g>

        {/* dot at (170,125) — скрывается когда появляется cigar */}
        <circle cx="170" cy="125" r="2" fill="#38bdf8" opacity="0.4">
          <animate attributeName="opacity" values="0.4;0.4;0;0;0.4;0.4"
            keyTimes="0;0.593;0.627;0.793;0.860;1" dur="6s" repeatCount="indefinite"/>
        </circle>
        {/* expanding ring at (170,125) */}
        <circle cx="170" cy="125" r="2" fill="none" stroke="#7dd3fc" strokeWidth="0.8" opacity="0">
          <animate attributeName="r"       values="2;10;10"  keyTimes="0;0.12;1" dur="6s" begin="3.56s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0;0.6;0"  keyTimes="0;0.04;0.2" dur="6s" begin="3.56s" repeatCount="indefinite"/>
        </circle>

        {/* cigar silhouette — появляется когда лупа проходит через (170,125) в t=3.56s */}
        <g transform="translate(170,125) scale(0.024) translate(-1022,-516)" fill="#38bdf8" opacity="0">
          <animate attributeName="opacity" values="0;0;0.9;0.9;0;0"
            keyTimes="0;0.593;0.627;0.793;0.860;1" dur="6s" repeatCount="indefinite"/>
          {capPaths.map((d,i) => <path key={i} d={d}/>)}
        </g>

        {/* magnifying glass — минималистичный, в тон карточки */}
        <g opacity="0.45">
          <animateMotion
            path="M40,30 L120,20 L200,40 L210,100 L170,125 L90,120 L60,90 L40,30"
            dur="6s" repeatCount="indefinite"/>
          <circle cx="0" cy="0" r="5" fill="none" stroke="#7dd3fc" strokeWidth="0.9"/>
          <line x1="3.5" y1="3.5" x2="6.5" y2="6.5" stroke="#7dd3fc" strokeWidth="0.9" strokeLinecap="round"/>
        </g>
      </svg>
    ),
  },
]

/* ── helpers ────────────────────────────────────────────── */
const polar = (cx, cy, r, deg) => {
  const a = (deg - 90) * Math.PI / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

/* ── radar component ────────────────────────────────────── */
const Radar = () => {
  const C = 90, R = 86

  // tick marks every 30°
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const deg = i * 30
    const isMajor = i % 3 === 0
    const [x1, y1] = polar(C, C, R - (isMajor ? 7 : 4), deg)
    const [x2, y2] = polar(C, C, R, deg)
    return { x1, y1, x2, y2, isMajor }
  })

  // blips
  const blips = [
    { cx: 130, cy: 48,  r: 2.8, dur: '2.8s', delay: '0s',    color: '#a78bfa' },
    { cx: 50,  cy: 118, r: 2.2, dur: '3.5s', delay: '0.7s',  color: '#c4b5fd' },
    { cx: 138, cy: 100, r: 2.0, dur: '4.1s', delay: '1.4s',  color: '#7c3aed' },
    { cx: 58,  cy: 42,  r: 1.8, dur: '3.2s', delay: '2.0s',  color: '#a78bfa' },
    { cx: 118, cy: 138, r: 1.6, dur: '4.6s', delay: '0.4s',  color: '#c4b5fd' },
  ]

  return (
    <div style={{
      position: 'relative', width: 180, height: 180, marginBottom: -20,
      WebkitMaskImage: 'radial-gradient(circle, black 44%, transparent 70%)',
      maskImage: 'radial-gradient(circle, black 44%, transparent 70%)',
    }}>
      <svg width="180" height="180" viewBox="0 0 180 180" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#1a0b35" stopOpacity="0.95"/>
            <stop offset="55%"  stopColor="#0e0720" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#080808" stopOpacity="0"/>
          </radialGradient>

          {/* sweep trail — conic из центра */}
          <radialGradient id="trailFade" cx="50%" cy="50%" r="50%">
            <stop offset="10%"  stopColor="#6d28d9" stopOpacity="0.0"/>
            <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.35"/>
          </radialGradient>

          <filter id="armGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="blipGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="coreGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* bg */}
        <circle cx={C} cy={C} r={R} fill="url(#radarBg)"/>

        {/* outer dashed ring */}
        <circle cx={C} cy={C} r={R} fill="none"
          stroke="rgba(139,92,246,0.25)" strokeWidth="0.8"
          strokeDasharray="3 5"/>

        {/* inner rings */}
        {[62, 42, 22].map((r, i) => (
          <circle key={r} cx={C} cy={C} r={r} fill="none"
            stroke={`rgba(139,92,246,${0.07 + i * 0.02})`} strokeWidth="0.6"/>
        ))}

        {/* sector lines every 45° */}
        {[0,45,90,135].map(deg => {
          const [x2,y2] = polar(C,C,R,deg)
          const [x1,y1] = polar(C,C,0,deg)
          return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="rgba(139,92,246,0.06)" strokeWidth="0.6"/>
        })}

        {/* tick marks */}
        {ticks.map((t,i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={t.isMajor ? 'rgba(167,139,250,0.35)' : 'rgba(139,92,246,0.18)'}
            strokeWidth={t.isMajor ? 1 : 0.6}/>
        ))}

        {/* degree labels */}
        {['N','E','S','W'].map((lbl, i) => {
          const [x,y] = polar(C, C, R - 13, i * 90)
          return <text key={lbl} x={x} y={y+3.5} textAnchor="middle"
            fontSize="6" fill="rgba(167,139,250,0.35)" fontFamily="monospace" letterSpacing="0.5">
            {lbl}
          </text>
        })}

        {/* pulse rings from center */}
        {[0, 0.9, 1.8].map((delay, i) => (
          <circle key={i} cx={C} cy={C} r="0" fill="none"
            stroke={`rgba(167,139,250,${0.7 - i * 0.2})`}
            strokeWidth={1.2 - i * 0.3}>
            <animate attributeName="r" values={`0;${R}`} dur="2.8s" begin={`${delay}s`} repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.8;0" dur="2.8s" begin={`${delay}s`} repeatCount="indefinite"/>
          </circle>
        ))}

        {/* sweep trail */}
        <g style={{ transformOrigin: `${C}px ${C}px`, animation: 'sweep 3s linear infinite' }}>
          {/* wide soft trail */}
          <path d={`M${C},${C} L${C},${C-R} A${R},${R} 0 0,0 ${C-R},${C} Z`}
            fill="rgba(109,40,217,0.12)"/>
          {/* tighter bright trail */}
          <path d={`M${C},${C} L${C},${C-R} A${R},${R} 0 0,0 ${C - R*0.71},${C - R*0.71} Z`}
            fill="rgba(139,92,246,0.18)"/>
        </g>

        {/* sweep arm */}
        <g style={{ transformOrigin: `${C}px ${C}px`, animation: 'sweep 3s linear infinite' }}>
          <line x1={C} y1={C} x2={C} y2={C-R+2}
            stroke="rgba(192,168,255,0.9)" strokeWidth="1"
            filter="url(#armGlow)"/>
          {/* tip */}
          <circle cx={C} cy={C-R+5} r="2.5" fill="#c4b5fd" filter="url(#armGlow)"/>
          {/* mid dot */}
          <circle cx={C} cy={C-42} r="1.2" fill="rgba(167,139,250,0.6)"/>
        </g>

        {/* blips */}
        {blips.map((b,i) => (
          <g key={i}>
            <circle cx={b.cx} cy={b.cy} r={b.r} fill={b.color} filter="url(#blipGlow)">
              <animate attributeName="opacity" values="0.9;0.1;0.9" dur={b.dur} begin={b.delay} repeatCount="indefinite"/>
            </circle>
            {/* expanding ring on blip */}
            <circle cx={b.cx} cy={b.cy} r="0" fill="none" stroke={b.color} strokeWidth="0.6">
              <animate attributeName="r" values={`0;${b.r * 4}`} dur={b.dur} begin={b.delay} repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.5;0" dur={b.dur} begin={b.delay} repeatCount="indefinite"/>
            </circle>
          </g>
        ))}

        {/* core glow */}
        <circle cx={C} cy={C} r="10" fill="rgba(109,40,217,0.3)" filter="url(#coreGlow)"/>
      </svg>

      {/* center logo */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 36, height: 36, borderRadius: '50%',
        background: 'rgba(88,28,220,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#ddd6fe',
      }}>
        <GiftIcon/>
      </div>
    </div>
  )
}

/* ── network lines ──────────────────────────────────────── */
const NetworkLines = () => (
  <svg
    style={{
      position: 'fixed', inset: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 0, overflow: 'visible',
    }}
    preserveAspectRatio="none"
  >
    <defs>
      <filter id="lineGlow">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>

      {/* flow animation — данные бегут по линиям */}
      <style>{`
        @keyframes flow {
          from { stroke-dashoffset: 300; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes flowSlow {
          from { stroke-dashoffset: 500; }
          to   { stroke-dashoffset: 0; }
        }
        .line-flow  { stroke-dasharray: 4 18; animation: flow     6.7s linear infinite; }
        .line-slow  { stroke-dasharray: 3 28; animation: flowSlow 10.5s linear infinite; }
        .node-pulse { animation: blipPulse 3s ease-in-out infinite; }
        @keyframes blipPulse {
          0%,100% { opacity: 0.6; r: 2; }
          50%     { opacity: 1;   r: 3; }
        }
      `}</style>
    </defs>

    {/*
      Все линии идут из точки ~(50%, 19%) — примерно центр радара.
      Используем % через viewBox 100x100 + preserveAspectRatio="none"
      Но лучше использовать vw/vh единицы через foreignObject — нет.
      Проще: viewBox="0 0 390 844" и позиции хардкодим под телефон.
      Линии выходят за края (отрицательные координаты / > 390 / > 844).
    */}

    {/* origin точка — центр радара */}
    {/* ↖ верхний левый */}
    <line x1="50%" y1="10%" x2="-5%"  y2="-2%"  stroke="rgba(139,92,246,0.18)" strokeWidth="0.7" filter="url(#lineGlow)"/>
    <line x1="50%" y1="10%" x2="-5%"  y2="-2%"  stroke="rgba(167,139,250,0.4)" strokeWidth="0.7" className="line-flow"/>
    {/* node */}
    <circle cx="20%" cy="8%" r="2" fill="#7c3aed" opacity="0.5" className="node-pulse" filter="url(#lineGlow)"/>
    {/* ветка от node */}
    <line x1="20%" y1="8%" x2="-8%" y2="18%" stroke="rgba(139,92,246,0.1)" strokeWidth="0.5"/>
    <line x1="20%" y1="8%" x2="-8%" y2="18%" stroke="rgba(167,139,250,0.3)" strokeWidth="0.5" className="line-slow"/>

    {/* ↗ верхний правый */}
    <line x1="50%" y1="10%" x2="108%" y2="-3%"  stroke="rgba(139,92,246,0.15)" strokeWidth="0.7" filter="url(#lineGlow)"/>
    <line x1="50%" y1="10%" x2="108%" y2="-3%"  stroke="rgba(167,139,250,0.35)" strokeWidth="0.7" className="line-flow" style={{animationDelay:'0.6s'}}/>
    <circle cx="80%" cy="6%" r="1.8" fill="#a78bfa" opacity="0.5" className="node-pulse" filter="url(#lineGlow)" style={{animationDelay:'1s'}}/>
    <line x1="80%" y1="6%" x2="110%" y2="14%" stroke="rgba(139,92,246,0.1)" strokeWidth="0.5"/>
    <line x1="80%" y1="6%" x2="110%" y2="14%" stroke="rgba(167,139,250,0.25)" strokeWidth="0.5" className="line-slow" style={{animationDelay:'1.2s'}}/>

    {/* ← левый */}
    <line x1="50%" y1="10%" x2="-5%"  y2="30%"  stroke="rgba(139,92,246,0.12)" strokeWidth="0.6" filter="url(#lineGlow)"/>
    <line x1="50%" y1="10%" x2="-5%"  y2="30%"  stroke="rgba(167,139,250,0.3)" strokeWidth="0.6" className="line-slow" style={{animationDelay:'0.3s'}}/>
    <circle cx="14%" cy="26%" r="1.6" fill="#7c3aed" opacity="0.4" className="node-pulse" filter="url(#lineGlow)" style={{animationDelay:'0.5s'}}/>
    <line x1="14%" y1="26%" x2="-6%" y2="42%" stroke="rgba(139,92,246,0.08)" strokeWidth="0.5"/>

    {/* → правый */}
    <line x1="50%" y1="10%" x2="108%" y2="28%"  stroke="rgba(139,92,246,0.12)" strokeWidth="0.6" filter="url(#lineGlow)"/>
    <line x1="50%" y1="10%" x2="108%" y2="28%"  stroke="rgba(167,139,250,0.28)" strokeWidth="0.6" className="line-flow" style={{animationDelay:'1.4s'}}/>
    <circle cx="87%" cy="25%" r="1.8" fill="#a78bfa" opacity="0.45" className="node-pulse" filter="url(#lineGlow)" style={{animationDelay:'0.8s'}}/>

    {/* ↙ нижний левый */}
    <line x1="50%" y1="10%" x2="-5%"  y2="75%"  stroke="rgba(139,92,246,0.1)" strokeWidth="0.6" filter="url(#lineGlow)"/>
    <line x1="50%" y1="10%" x2="-5%"  y2="75%"  stroke="rgba(167,139,250,0.22)" strokeWidth="0.6" className="line-slow" style={{animationDelay:'0.9s'}}/>
    <circle cx="22%" cy="52%" r="1.6" fill="#7c3aed" opacity="0.35" className="node-pulse" filter="url(#lineGlow)" style={{animationDelay:'1.5s'}}/>
    <line x1="22%" y1="52%" x2="-6%" y2="60%" stroke="rgba(139,92,246,0.07)" strokeWidth="0.4"/>

    {/* ↘ нижний правый */}
    <line x1="50%" y1="10%" x2="108%" y2="72%"  stroke="rgba(139,92,246,0.1)" strokeWidth="0.6" filter="url(#lineGlow)"/>
    <line x1="50%" y1="10%" x2="108%" y2="72%"  stroke="rgba(167,139,250,0.2)" strokeWidth="0.6" className="line-slow" style={{animationDelay:'0.4s'}}/>
    <circle cx="78%" cy="50%" r="1.5" fill="#a78bfa" opacity="0.3" className="node-pulse" filter="url(#lineGlow)" style={{animationDelay:'2s'}}/>

    {/* прямо вниз */}
    <line x1="50%" y1="10%" x2="50%"  y2="105%" stroke="rgba(139,92,246,0.1)" strokeWidth="0.6" filter="url(#lineGlow)"/>
    <line x1="50%" y1="10%" x2="50%"  y2="105%" stroke="rgba(167,139,250,0.2)" strokeWidth="0.6" className="line-flow" style={{animationDelay:'1.8s'}}/>
    <circle cx="50%" cy="60%" r="1.5" fill="#7c3aed" opacity="0.25" className="node-pulse" filter="url(#lineGlow)" style={{animationDelay:'1.1s'}}/>
  </svg>
)

/* ── styles ─────────────────────────────────────────────── */
/* ── component ──────────────────────────────────────────── */
const getTgHeight = () =>
  window.Telegram?.WebApp?.viewportHeight || window.innerHeight

export default function Home() {
  const navigate = useNavigate()
  const [active, setActive] = useState(0)
  const [vh, setVh] = useState(getTgHeight)
  const [dragOffset, setDragOffset] = useState(0)
  const [isTouching, setIsTouching] = useState(false)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const isDragging = useRef(false)

  useEffect(() => {
    const update = () => setVh(getTgHeight())
    window.Telegram?.WebApp?.onEvent('viewportChanged', update)
    window.addEventListener('resize', update)
    return () => {
      window.Telegram?.WebApp?.offEvent('viewportChanged', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const next = () => setActive(i => (i + 1) % cards.length)
  const prev = () => setActive(i => (i - 1 + cards.length) % cards.length)

  const onTouchStart = e => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isDragging.current = false
    setIsTouching(true)
  }
  const onTouchMove = e => {
    if (touchStartX.current === null) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current)
    if (Math.abs(dx) > dy) {
      isDragging.current = true
      setDragOffset(dx)
    }
  }
  const onTouchEnd = e => {
    setIsTouching(false)
    setDragOffset(0)
    if (!isDragging.current) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff > 40) next()
    else if (diff < -40) prev()
    touchStartX.current = null
    isDragging.current = false
  }

  const getPos = (i) => {
    if (i === active) return 'active'
    if (i === (active + 1) % cards.length) return 'next'
    return 'prev'
  }

  return (
    <div style={{ background: '#080808', minHeight: vh, display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>

        <NetworkLines/>

        {/* ── ambient orbs ── */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div className="orb-a" style={{
            position: 'absolute', top: '-10%', left: '-10%',
            width: 320, height: 320, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 70%)',
          }}/>
          <div className="orb-b" style={{
            position: 'absolute', bottom: '5%', right: '-15%',
            width: 280, height: 280, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(3,105,161,0.14) 0%, transparent 70%)',
          }}/>
        </div>

        {/* ── dot grid ── */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}/>

        {/* ── hero ── */}
        <div style={{ padding: '10px 24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>

          <Radar/>

          <h1 className="shimmer-text" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.6px', margin: 0, lineHeight: 1 }}>
            Overwatch
          </h1>
          <p style={{ fontSize: 11, color: '#3f3f46', marginTop: 8, letterSpacing: '0.14em', fontWeight: 500 }}>
            TELEGRAM GIFT LISTINGS
          </p>

          {/* live badge */}
          <div style={{
            marginTop: 16, display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 100, padding: '5px 12px',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }}/>
            <span style={{ fontSize: 11, color: '#52525b', letterSpacing: '0.05em' }}>LIVE</span>
          </div>
        </div>

        {/* ── divider ── */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)', margin: '28px 24px' }}/>

        {/* ── 3D carousel ── */}
        <div style={{
          position: 'relative', height: 340, paddingTop: 10, zIndex: 1,
          perspective: '1000px', perspectiveOrigin: '50% 50%',
          overflow: 'hidden', touchAction: 'none',
        }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {cards.map((card, i) => (
            <HomeCard
              key={card.id}
              card={card}
              position={getPos(i)}
              dragOffset={dragOffset}
              isTouching={isTouching}
              onClick={() => {
                if (getPos(i) === 'active') navigate(card.path)
                else if (getPos(i) === 'next') next()
                else prev()
              }}
            />
          ))}
        </div>

        {/* dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16, zIndex: 1, position: 'relative' }}>
          {cards.map((_, i) => (
            <div key={i} onClick={() => setActive(i)} style={{
              width: i === active ? 20 : 6, height: 6,
              borderRadius: 3,
              background: i === active ? cards[active].color2 : 'rgba(255,255,255,0.15)',
              transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
              cursor: 'pointer',
            }}/>
          ))}
        </div>

        {/* ── footer ── */}
        <div style={{ marginTop: 'auto', padding: '28px 24px 32px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 10, color: '#27272a', letterSpacing: '0.1em', fontWeight: 600 }}>
            GETGEMS · FRAGMENT
          </div>
        </div>

    </div>
  )
}
