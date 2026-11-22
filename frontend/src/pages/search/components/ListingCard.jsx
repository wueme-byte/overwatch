import { useState, useEffect } from 'react'
import { backdropCss } from '../../../lib/backdropColors'
import getgemsLogo from '../../../assets/markets/getgems.png'
import portalsLogo from '../../../assets/markets/portals.png'
import gramLogo from '../../../assets/markets/gram.png'
import getgemsPattern from '../../../assets/markets/getgems-pattern.jpg'
import portalsPattern from '../../../assets/markets/portals-pattern.png'
import mrktPattern from '../../../assets/markets/mrkt-pattern.png'

// Фирменный стиль площадок (цвета сняты с их логотипов).
// Маркет обозначают полоска слева, лёгкий оттенок фона и бейдж под ценой.
// MRKT и Portals приходят через GetGems (ExternalSale) с прямой ссылкой на лот.
const MARKETS = {
  GetGems: {
    rgb: '56,170,250',
    badge: { top: '#7cceff', bottom: '#1288e8', edge: '#0a5fa8', color: '#ffffff' },
    logo: getgemsLogo,
    // толпа персонажей — сама по себе узор, тянем как текстуру
    pattern: { src: getgemsPattern, size: 150, opacity: 0.16, brick: false },
  },
  Portals: {
    rgb: '37,99,235',
    badge: { top: '#2f6be0', bottom: '#0d2a6e', edge: '#06163d', color: '#e0ecff' },
    logo: portalsLogo,
    pattern: { src: portalsPattern, size: 46, opacity: 0.2, brick: true },
  },
  MRKT: {
    rgb: '254,215,13',
    badge: { top: '#fff07a', bottom: '#f2c500', edge: '#a88600', color: '#050706' },
    bold: true,
    pattern: { src: mrktPattern, size: 44, opacity: 0.14, brick: true },
  },
  // оранжевый, а не янтарный — иначе сливается с жёлтым MRKT
  Fragment: {
    rgb: '249,115,22',
    badge: { top: '#fed7aa', bottom: '#f97316', edge: '#b4500c', color: '#ffffff' },
    bold: true,
  },
}

const PILL = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  fontSize: 10, fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 999,
  lineHeight: '14px',
}

// Объёмная «резиновая» кнопка как на пульте: выпуклый верх с бликом,
// торец снизу (сплошная тень цвета edge) и мягкая тень под кнопкой.
function button3d({ top, bottom, edge }) {
  return {
    background: `radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 55%), linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`,
    border: 'none',
    boxShadow: [
      'inset 0 1px 0 rgba(255,255,255,0.55)',   // кромка блика
      'inset 0 -1.5px 1px rgba(0,0,0,0.22)',    // скругление низа
      `0 2px 0 ${edge}`,                        // толщина кнопки
      '0 3px 6px rgba(0,0,0,0.55)',             // тень на карточку
    ].join(', '),
    textShadow: '0 1px 0 rgba(255,255,255,0.18)',
    transform: 'translateY(-1px)',
  }
}

function MarketPattern({ pattern }) {
  if (!pattern) return null
  const { src, size, opacity, brick } = pattern
  return (
    <div aria-hidden style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none',
      // узор виден в середине и растворяется к имени и к цене
      WebkitMaskImage: 'linear-gradient(90deg, transparent 18%, #000 42%, #000 58%, transparent 80%)',
      maskImage: 'linear-gradient(90deg, transparent 18%, #000 42%, #000 58%, transparent 80%)',
    }}>
      <div style={{
        position: 'absolute', inset: '-60% -20%',
        transform: 'rotate(-14deg)',
        opacity,
        backgroundImage: brick ? `url(${src}), url(${src})` : `url(${src})`,
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: brick ? `0 0, ${size / 2}px ${size / 2}px` : '0 0',
        backgroundRepeat: 'repeat',
      }} />
    </div>
  )
}

function MarketBadge({ name }) {
  const m = MARKETS[name] || MARKETS.GetGems
  return (
    <span style={{
      ...PILL,
      ...button3d(m.badge),
      color: m.badge.color,
      fontWeight: m.bold ? 800 : 600,
      letterSpacing: m.bold ? '0.3px' : 0,
    }}>
      {m.logo && <img src={m.logo} alt="" style={{ height: 10, width: 'auto', display: 'block' }} />}
      {name}
    </span>
  )
}

const BEST_BG = 'linear-gradient(135deg, rgba(109,40,217,0.2) 0%, rgba(139,92,246,0.07) 100%)'
// оттенок маркета слева, растворяется к середине карточки
const tintBg = rgb => `linear-gradient(90deg, rgba(${rgb},0.07) 0%, rgba(${rgb},0.02) 45%, rgba(255,255,255,0.025) 100%)`

// Карточка с лучшей ценой: свой фон (глубокий фиолетовый, свечение за ценой,
// искорки), узор маркета на ней не показывается. Раз в несколько секунд —
// мягкий блик, как по глянцу. Вернуть старый вид: вместо <BestGlow /> — null.
const BEST_KEYFRAMES = `
@keyframes ow-best-shine {
  0%   { transform: translateX(-160%) skewX(-20deg); }
  35%  { transform: translateX(360%)  skewX(-20deg); }
  100% { transform: translateX(360%)  skewX(-20deg); }
}
@media (prefers-reduced-motion: reduce) { .ow-best-shine { animation: none !important; opacity: 0; } }
`

// плитка с тремя четырёхлучевыми звёздочками разного размера
const star = (x, y, r, o) =>
  `<path d='M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z' fill='%23ddd6fe' fill-opacity='${o}'/>`
const SPARKLES = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='40'>${
  star(10, 9, 4, 0.55) + star(40, 26, 5.5, 0.7) + star(56, 6, 2.5, 0.45) + star(24, 34, 2, 0.4)
}</svg>`

function BestGlow() {
  return (
    <>
      <style>{BEST_KEYFRAMES}</style>
      {/* глубокий фиолетовый + свечение за ценой */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: [
          'radial-gradient(70% 140% at 88% 50%, rgba(167,139,250,0.30) 0%, rgba(167,139,250,0) 60%)',
          'linear-gradient(135deg, rgba(91,33,182,0.38) 0%, rgba(76,29,149,0.18) 55%, rgba(46,16,101,0.30) 100%)',
        ].join(', '),
      }} />
      {/* искорки ✦ вместо персонажей маркета — в середине, к краям растворяются */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `url("${SPARKLES}")`,
        backgroundSize: '64px 40px',
        opacity: 0.55,
        WebkitMaskImage: 'linear-gradient(90deg, transparent 15%, #000 40%, #000 62%, transparent 85%)',
        maskImage: 'linear-gradient(90deg, transparent 15%, #000 40%, #000 62%, transparent 85%)',
      }} />
      {/* блик */}
      <div aria-hidden className="ow-best-shine" style={{
        position: 'absolute', top: '-20%', bottom: '-20%', left: 0,
        width: '28%',
        pointerEvents: 'none',
        background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(221,214,254,0.16) 50%, rgba(255,255,255,0) 100%)',
        animation: 'ow-best-shine 4.5s ease-in-out 1s infinite',
        transform: 'translateX(-160%) skewX(-20deg)',
      }} />
    </>
  )
}

// отступ глазика от левого края карточки (px); слева от него — модель + редкость
const EYE_LEFT = 122

// Уровни редкости крафтовых подарков (вместо процента у них слово)
const CRAFT_TIERS = {
  legendary: { rank: -4, color: '#fbbf24' },   // золото
  epic:      { rank: -3, color: '#c084fc' },   // фиолетовый
  rare:      { rank: -2, color: '#7dd3fc' },   // голубой
  uncommon:  { rank: -1, color: '#4ade80' },   // зелёный
}
const craftTier = r => CRAFT_TIERS[String(r ?? '').trim().toLowerCase()]

// Для сортировки «от редких к обычным»: крафтовые уровни идут первыми
// (Legendary → Uncommon), затем проценты по возрастанию, без данных — в конце
export function rarityRank(r) {
  const tier = craftTier(r)
  if (tier) return tier.rank
  const v = parseFloat(String(r ?? '').replace(',', '.'))
  return Number.isFinite(v) ? v : Infinity
}

// Цвет редкости: чем реже, тем «дороже» цвет
export function rarityColor(pct) {
  const tier = craftTier(pct)
  if (tier) return tier.color
  const v = parseFloat(String(pct).replace(',', '.'))
  if (v <= 0.5) return '#fbbf24'   // золото
  if (v <= 1)   return '#c084fc'   // фиолетовый
  if (v <= 2)   return '#7dd3fc'   // голубой
  return 'rgba(255,255,255,0.45)'
}

export default function ListingCard({ item, isBest, rarity, modelImages = [], onRarityClick }) {
  // номер текущего источника картинки модели; при ошибке берём следующий
  const [imgIdx, setImgIdx] = useState(0)
  const modelImage = modelImages[imgIdx]
  // карточки переиспользуются между страницами — для новой модели начинаем с первого источника
  useEffect(() => { setImgIdx(0) }, [modelImages[0]])
  const backdropName = item.attributes?.Backdrop
  const backdropColor = backdropName ? backdropCss(backdropName) : null
  const isFragment = item.marketplace === 'Fragment'
  // Слаг подарка: "Voodoo Doll #11490" → "VoodooDoll-11490"
  const giftUrl = `https://t.me/nft/${item.name.replace(/[\s']/g, '').replace('#', '-')}`
  const isAuction = isFragment && item.attributes?.fragment_status === 'On auction'
  const market = MARKETS[item.marketplace] || MARKETS.GetGems
  const bg = isBest ? BEST_BG : tintBg(market.rgb)

  return (
    <div style={{ position: 'relative' }}>
      <a
        href={item.listing_url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px 12px 16px',
          borderRadius: 16,
          background: bg,
          border: isBest
            ? '1px solid rgba(139,92,246,0.35)'
            : '1px solid rgba(255,255,255,0.07)',
          borderLeft: `3px solid rgba(${market.rgb},0.85)`,
          overflow: 'hidden',
          textDecoration: 'none',
          transition: 'background 150ms ease',
          WebkitTapHighlightColor: 'transparent',
        }}
        onTouchStart={e => e.currentTarget.style.background = isBest ? 'rgba(109,40,217,0.25)' : 'rgba(255,255,255,0.06)'}
        onTouchEnd={e => e.currentTarget.style.background = bg}
      >
        {/* у лучшей карточки свой фон, узор маркета на ней не дублируем */}
        {isBest ? <BestGlow /> : <MarketPattern pattern={market.pattern} />}

        {/* left: name + model */}
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#ffffff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: 3,
          }}>{item.name}</p>
          {/* ширина строки ограничена, чтобы не заезжать под глазик (он стоит на EYE_LEFT);
              обрезается название модели, процент виден всегда */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, maxWidth: EYE_LEFT - 19 - 6, fontSize: 11 }}>
            <span style={{
              color: 'rgba(255,255,255,0.3)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
            }}>{item.model || (isFragment ? 'Auction live' : '\u00A0')}</span>
            {rarity && (
              // тап по редкости — шторка со всеми моделями (а не переход по ссылке карточки)
              <span
                role="button"
                onClick={e => { if (onRarityClick) { e.preventDefault(); e.stopPropagation(); onRarityClick(item.model) } }}
                style={{
                  flexShrink: 0, fontWeight: 700, color: rarityColor(rarity),
                  padding: '1px 5px', margin: '-1px 0', borderRadius: 6,
                  background: 'rgba(255,255,255,0.07)',
                  cursor: onRarityClick ? 'pointer' : 'default',
                }}
              >{rarity}</span>
            )}
          </div>
        </div>

        {/* right: price + badges */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.3px' }}>
              {Number(item.price_ton).toFixed(2)}
            </span>
            {/* логотип GRAM вместо подписи «TON» */}
            <img src={gramLogo} alt="GRAM" title="GRAM" style={{ width: 15, height: 15, display: 'block', flexShrink: 0 }} />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {isBest && (
              <span style={{
                ...PILL,
                ...button3d({ top: '#8b5cf6', bottom: '#4c1d95', edge: '#2e1065' }),
                fontSize: 9,
                fontWeight: 700,
                color: '#ede9fe',
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
              }}>Best Price</span>
            )}
            {isAuction && (
              <span style={{
                ...PILL,
                ...button3d({ top: '#c084fc', bottom: '#7e22ce', edge: '#4a1477' }),
                fontWeight: 600,
                color: '#ffffff',
              }}>Auction</span>
            )}
            <MarketBadge name={item.marketplace} />
          </div>
        </div>

      </a>

      {/* Глазик вынесен из карточки: вложенные <a> недопустимы, а главное —
          переход по ссылке t.me/nft Телеграм перехватывает сам и показывает
          превью подарка поверх приложения, так же как по ссылке в чате.
          Через WebApp.openTelegramLink это не работает: с 20.07.2026 (Bot API 10.2)
          вызовы методов Mini App молча игнорируются при несовпадении origin. */}
      <div style={{
        position: 'absolute',
        left: EYE_LEFT,
        top: '68%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <a
          href={giftUrl}
          aria-label={`Показать подарок ${item.name}`}
          style={{
            width: 24, height: 24,
            boxSizing: 'border-box',
            borderRadius: '50%',
            // сплошной фон: узор карточки сквозь глазик не просвечивает
            background: 'linear-gradient(145deg, #3a2470 0%, #1f1440 100%)',
            border: '1px solid rgba(139,92,246,0.55)',
            boxShadow: '0 0 8px rgba(139,92,246,0.3), 0 2px 4px rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0,
            textDecoration: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(196,181,253,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </a>

        {backdropColor && (
          // тонкая глубоко-чёрная рамка, внутри — глянцевая капля цвета фона
          <div
            title={backdropName}
            style={{
              width: 18, height: 18,
              boxSizing: 'border-box',
              borderRadius: '50%',
              border: '1.5px solid #000',
              // свечение цветом фона — чтобы цвет читался ярче на тёмной карточке
              boxShadow: `0 0 7px ${backdropColor}aa, 0 2px 4px rgba(0,0,0,0.5)`,
            }}
          >
            <div style={{
              width: '100%', height: '100%',
              borderRadius: '50%',
              // маленький мягкий блик, без затемнения — цвет остаётся чистым
              background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 30%), ${backdropColor}`,
            }} />
          </div>
        )}

        {/* иконка модели подарка; если картинки нет — просто не показываем */}
        {modelImage && (
          <img
            src={modelImage}
            alt={item.model}
            loading="lazy"
            onError={() => setImgIdx(i => i + 1)}
            style={{
              width: 30, height: 30,
              objectFit: 'contain',
              flexShrink: 0,
              marginLeft: 2,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
    </div>
  )
}
