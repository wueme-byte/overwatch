import { useState, useEffect, useRef } from 'react'
import gramLogo from '../../../assets/markets/gram.png'

// Картинку коллекции грузим, только когда карточка подъехала к экрану на ~полэкрана.
// Встроенный loading="lazy" не подходит: Chrome/Android заранее тянет всё в пределах
// 1250–2500px, а весь грид ~3500px — выходило 125 картинок (~10 МБ) сразу.
// Наблюдаем внутри прокручиваемого грида (data-lazy-root в pages/search/index.jsx).
function useNearScreen() {
  const ref = useRef(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect() } },
      { root: el.closest('[data-lazy-root]'), rootMargin: '400px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [near])
  return [ref, near]
}

function CollectionAvatar({ col }) {
  const [imgOk, setImgOk] = useState(!!col.image)
  const [ref, near] = useNearScreen()
  const initials = col.name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
  if (!imgOk) return (
    <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-gray-300">
      {initials}
    </div>
  )
  return (
    <div ref={ref} className="w-full h-full">
      {near && (
        <img
          src={col.image}
          alt={col.name}
          className="w-full h-full object-cover"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgOk(false)}
        />
      )}
    </div>
  )
}

// 188 → "188", 2861 → "2.9K", 181231 → "181K", 1250000 → "1.3M"
function formatSupply(n) {
  if (n < 1000) return String(n)
  const short = (v, unit) => `${v.toFixed(v < 10 ? 1 : 0).replace(/\.0$/, '')}${unit}`
  if (n < 999_500) return short(n / 1000, 'K')
  return short(n / 1_000_000, 'M')
}

// флор: один знак после точки, обычное округление:
// 9.69 → "9.7", 9.64 → "9.6", 312.9 → "313", 1572 → "1.6K"
function formatFloor(p) {
  if (p >= 1000) return `${(p / 1000).toFixed(p < 10_000 ? 1 : 0).replace(/\.0$/, '')}K`
  if (p >= 100) return String(Math.round(p))
  return String(Math.round(p * 10) / 10)
}

// цвет плашки supply по редкости: чем меньше выпущено, тем «дороже» цвет
function supplyTier(n) {
  if (n <= 5_000)   return { color: '#f5c451', border: 'rgba(245,196,81,0.55)' }    // золото
  if (n <= 50_000)  return { color: '#b794ff', border: 'rgba(183,148,255,0.5)' }    // фиолетовый
  if (n <= 200_000) return { color: '#6cc6ff', border: 'rgba(108,198,255,0.45)' }   // голубой
  return { color: 'rgba(255,255,255,0.72)', border: 'rgba(255,255,255,0.22)' }     // серый
}

export default function CollectionCard({ col, isNew, onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col active:scale-[0.94] transition-transform w-full"
    >
      <div className="relative overflow-hidden w-full" style={{
        borderRadius: 16,
        // Новинки обводятся тем же зелёным, что и плашка NEW
        ...(isNew && {
          border: '1.5px solid rgba(16,185,129,0.9)',
          boxShadow: '0 0 10px rgba(16,185,129,0.35)',
        }),
      }}>

          {/* картинка */}
          <div className="w-full aspect-square relative" style={{
            filter: 'saturate(1.1) contrast(1.05)',
          }}>
            <CollectionAvatar col={col} />
          </div>

          {/* фиолетовый оверлей сверху */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'linear-gradient(160deg, rgba(88,28,220,0.22) 0%, transparent 55%)'
          }}/>

          {/* свечение снизу */}
          <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{
            height: 40,
            background: 'linear-gradient(to top, rgba(109,40,217,0.5) 0%, transparent 100%)',
          }}/>

          {/* градиент снизу + название поверх */}
          <div className="absolute bottom-0 left-0 right-0" style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
            padding: '20px 6px 5px',
          }}>
            <span style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.9)',
              fontWeight: 500,
              textTransform: 'capitalize',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {col.name}
            </span>
          </div>

          {/* supply (выпущено всего) — слева сверху; справа место под NEW */}
          {col.supply > 0 && (
            <div className="absolute pointer-events-none" style={{
              top: 4, left: 4,
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.2px',
              padding: '2px 5px',
              borderRadius: 999,
              color: supplyTier(col.supply).color,
              background: 'rgba(0,0,0,0.55)',
              border: `1px solid ${supplyTier(col.supply).border}`,
            }}>{formatSupply(col.supply)}</div>
          )}

          {isNew && (
            <div className="absolute pointer-events-none" style={{
              top: 4, right: 4,
              fontSize: 8,
              fontWeight: 800,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              padding: '2px 5px',
              borderRadius: 999,
              color: '#ffffff',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.95) 0%, rgba(5,150,105,0.95) 100%)',
              border: '1px solid rgba(110,231,183,0.5)',
              boxShadow: '0 0 8px rgba(16,185,129,0.45)',
            }}>New</div>
          )}

      </div>

      {/* флор под карточкой: самая дешёвая цена «купить сразу» (GetGems + MRKT + Portals) */}
      {col.floor > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
          marginTop: 4,
          fontSize: 10, fontWeight: 600,
          color: 'rgba(255,255,255,0.85)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          <img src={gramLogo} alt="" style={{ width: 10, height: 10, display: 'block', flexShrink: 0 }} />
          <span>{formatFloor(col.floor)}</span>
        </div>
      )}
    </button>
  )
}
