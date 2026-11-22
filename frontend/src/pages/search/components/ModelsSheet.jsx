import { useState, useEffect } from 'react'
import { rarityColor, rarityRank } from './ListingCard'

// Шторка «все модели коллекции» — как окно в Telegram по тапу на процент.
// Сетка моделей с картинкой и редкостью, от самых редких; крафтовые (уровень
// вместо процента) — на отдельной вкладке. Тап по модели включает фильтр по ней.
// Модели, которых сейчас нет в продаже, показаны бледно и не нажимаются.

const isCrafted = r => r && !String(r).trim().endsWith('%')

function ModelImg({ sources, alt }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => { setIdx(0) }, [sources[0]])
  const src = sources[idx]
  if (!src) return <div style={{ width: 56, height: 56 }} />
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setIdx(i => i + 1)}
      style={{ width: 56, height: 56, objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}
    />
  )
}

export default function ModelsSheet({ title, rarity, available, selected, imageSources, onPick, onClose }) {
  const all = Object.keys(rarity)
  // модели в продаже, у которых редкость ещё не пришла, тоже показываем
  for (const m of available) if (!(m in rarity)) all.push(m)

  const crafted = all.filter(m => isCrafted(rarity[m]))
  const regular = all.filter(m => !isCrafted(rarity[m]))
  const sortFn = (a, b) => (rarityRank(rarity[a]) - rarityRank(rarity[b])) || a.localeCompare(b)

  const startTab = selected && isCrafted(rarity[selected]) ? 'crafted' : 'models'
  const [tab, setTab] = useState(startTab)
  const list = (tab === 'crafted' ? crafted : regular).sort(sortFn)
  const availableSet = new Set(available)

  // закрытие по «назад»/Escape на десктопе
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      <style>{`
        @keyframes ow-sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes ow-fade-in  { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* затемнение; тап — закрыть */}
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
        animation: 'ow-fade-in 200ms ease',
      }} />

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        maxHeight: '86svh',
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(180deg, #17122a 0%, #0d0b14 30%)',
        borderTop: '1px solid rgba(139,92,246,0.25)',
        borderRadius: '22px 22px 0 0',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.6)',
        animation: 'ow-sheet-up 260ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}>
        {/* ручка + шапка */}
        <div style={{ padding: '10px 16px 12px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 12px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', textTransform: 'capitalize' }}>{title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                {all.length} models · tap one to filter
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </div>

          {/* вкладки: обычные / крафтовые (если есть) */}
          {crafted.length > 0 && (
            <div style={{
              display: 'flex', gap: 4, marginTop: 12, padding: 3,
              background: 'rgba(255,255,255,0.05)', borderRadius: 999,
            }}>
              {[['models', `Models · ${regular.length}`], ['crafted', `Crafted · ${crafted.length}`]].map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} style={{
                  flex: 1, padding: '7px 0', borderRadius: 999, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  background: tab === id ? 'rgba(139,92,246,0.3)' : 'transparent',
                  color: tab === id ? '#ede9fe' : 'rgba(255,255,255,0.5)',
                }}>{label}</button>
              ))}
            </div>
          )}
        </div>

        {/* сетка */}
        <div style={{
          overflowY: 'auto', padding: '4px 12px calc(16px + env(safe-area-inset-bottom))',
          display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8,
        }}>
          {list.map(m => {
            const r = rarity[m]
            const on = m === selected
            const can = availableSet.has(m)
            return (
              <button
                key={m}
                onClick={() => can && onPick(m)}
                disabled={!can}
                style={{
                  position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '22px 6px 10px',
                  borderRadius: 16,
                  background: on ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)',
                  border: on ? '1.5px solid #3b82f6' : '1px solid rgba(255,255,255,0.06)',
                  opacity: can ? 1 : 0.35,
                  cursor: can ? 'pointer' : 'default',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {r && (
                  <span style={{
                    position: 'absolute', top: 6, right: 6,
                    fontSize: 10, fontWeight: 700,
                    padding: '2px 6px', borderRadius: 999,
                    background: 'rgba(0,0,0,0.35)',
                    color: rarityColor(r),
                  }}>{r}</span>
                )}
                <ModelImg sources={imageSources(m)} alt={m} />
                <span style={{
                  fontSize: 12, fontWeight: 500, color: '#fff',
                  maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{m}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
