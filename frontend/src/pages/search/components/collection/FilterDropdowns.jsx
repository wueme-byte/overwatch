import { backdropCss } from '../../../../lib/backdropColors'
import { rarityColor } from '../../../../lib/rarity'

// Выпадающие списки фильтров экрана коллекции: цвет фона и модель.
// (В8: вынесено из CollectionListings.jsx без изменений вёрстки)

// строка поиска вверху выпадающего списка (модели / цвета).
// fontSize 16 — иначе iOS зумит страницу при тапе в поле
const FilterSearch = ({ value, onChange, placeholder }) => (
  <div style={{
    position: 'sticky', top: 0, zIndex: 1,
    padding: '8px 10px',
    background: 'rgba(12,5,30,0.97)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  }}>
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.7)" strokeWidth="2.5" strokeLinecap="round"
        style={{ position: 'absolute', left: 10, pointerEvents: 'none' }}>
        <circle cx="11" cy="11" r="7"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '7px 30px 7px 30px', borderRadius: 10,
          background: 'rgba(139,92,246,0.08)',
          border: '1px solid rgba(139,92,246,0.25)',
          color: '#fff', fontSize: 16, outline: 'none',
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Clear"
          style={{
            position: 'absolute', right: 6, width: 20, height: 20, padding: 0,
            borderRadius: '50%', background: 'rgba(139,92,246,0.2)', border: 'none',
            color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18"/>
            <line x1="18" y1="6" x2="6" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  </div>
)

const NoMatches = () => (
  <div style={{ padding: '14px 16px', fontSize: 13, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
    Nothing found
  </div>
)

const matches = (name, q) => name.toLowerCase().includes(q.trim().toLowerCase())

export function ColorDropdown({ backdrops, backdropFilter, backdropQuery, setBackdropQuery, handleBackdropFilter }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 6px)', right: 16, left: 16,
      zIndex: 30,
      background: 'rgba(12,5,30,0.97)',
      border: '1px solid rgba(139,92,246,0.2)',
      borderRadius: 16,
      maxHeight: 260,
      overflowY: 'auto',
    }}>
      <FilterSearch value={backdropQuery} onChange={setBackdropQuery} placeholder="Search color" />
      <button
        onClick={() => handleBackdropFilter(null)}
        style={{
          width: '100%', textAlign: 'left', padding: '11px 16px', fontSize: 13,
          color: !backdropFilter.length ? '#a78bfa' : 'rgba(255,255,255,0.55)',
          background: !backdropFilter.length ? 'rgba(139,92,246,0.1)' : 'transparent',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          background: 'conic-gradient(#f59e0b, #50c878, #007fff, #bf00ff, #ff4040, #f59e0b)',
        }} />
        <span style={{ flex: 1 }}>All colors</span>
        {!backdropFilter.length && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </button>
      {backdropQuery.trim() && !backdrops.some(b => matches(b, backdropQuery)) && <NoMatches />}
      {backdrops.map((b, i) => !matches(b, backdropQuery) ? null : (
        <button
          key={b}
          onClick={() => handleBackdropFilter(b)}
          style={{
            width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 13,
            color: backdropFilter.includes(b) ? '#a78bfa' : 'rgba(255,255,255,0.55)',
            background: backdropFilter.includes(b) ? 'rgba(139,92,246,0.1)' : 'transparent',
            borderBottom: i < backdrops.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
            background: backdropCss(b),
            border: '1.5px solid rgba(255,255,255,0.15)',
            boxShadow: `0 0 6px ${backdropCss(b)}55`,
          }} />
          <span style={{ flex: 1 }}>{b}</span>
          {backdropFilter.includes(b) && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </button>
      ))}
    </div>
  )
}

export function ModelDropdown({ models, sortedModels, modelFilter, modelQuery, setModelQuery, handleModelFilter, modelImageUrl, modelImageFallback, rarity }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 6px)', right: 16, left: 16,
      zIndex: 30,
      background: 'rgba(12,5,30,0.97)',
      border: '1px solid rgba(139,92,246,0.2)',
      borderRadius: 16,
      maxHeight: 260,
      overflowY: 'auto',
    }}>
      <FilterSearch value={modelQuery} onChange={setModelQuery} placeholder="Search model" />
      <button
        onClick={() => handleModelFilter(null)}
        style={{
          width: '100%', textAlign: 'left', padding: '11px 16px', fontSize: 13,
          color: !modelFilter.length ? '#a78bfa' : 'rgba(255,255,255,0.55)',
          background: !modelFilter.length ? 'rgba(139,92,246,0.1)' : 'transparent',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center',
        }}
      >
        <span style={{ flex: 1 }}>All models</span>
        {!modelFilter.length && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </button>

      {modelQuery.trim() && !sortedModels.some(m => matches(m.name, modelQuery)) && <NoMatches />}
      {sortedModels.map((m, i) => !matches(m.name, modelQuery) ? null : (
        <button
          key={m.name}
          onClick={() => handleModelFilter(m.name)}
          style={{
            width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 13,
            textTransform: 'capitalize',
            color: modelFilter.includes(m.name) ? '#a78bfa' : 'rgba(255,255,255,0.55)',
            background: modelFilter.includes(m.name) ? 'rgba(139,92,246,0.1)' : 'transparent',
            borderBottom: i < models.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          {/* Картинку пробуем всегда: у многих моделей GetGems не присылает m.image,
              хотя иконка есть (у Hoarse Horses — у 36 из 91). Нет у GetGems — запасной
              источник, нет и там — пустое место того же размера. */}
          {(modelImageUrl(m.name) || modelImageFallback(m.name))
            ? <img
                src={modelImageUrl(m.name) || modelImageFallback(m.name)}
                alt={m.name}
                loading="lazy"
                onError={e => {
                  const img = e.currentTarget, fb = modelImageFallback(m.name)
                  if (fb && img.src !== fb) img.src = fb
                  else img.style.visibility = 'hidden'
                }}
                style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }}
              />
            : <div style={{ width: 32, height: 32, flexShrink: 0 }} />
          }
          <span style={{ flex: 1 }}>{m.name}</span>
          {rarity[m.name] && (
            <span style={{ fontSize: 12, fontWeight: 700, color: rarityColor(rarity[m.name]), flexShrink: 0 }}>
              {rarity[m.name]}
            </span>
          )}
          {modelFilter.includes(m.name) && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </button>
      ))}
    </div>
  )
}
