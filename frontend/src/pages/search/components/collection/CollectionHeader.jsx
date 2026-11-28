import { useState } from 'react'
import { backdropCss } from '../../../../lib/backdropColors'
import { ColorDropdown, ModelDropdown } from './FilterDropdowns'

// Шапка экрана коллекции: назад, аватар, название + число лотов, сброс и кнопки фильтров,
// под ней — выпадающие списки. (В8: вынесено из CollectionListings.jsx без изменений вёрстки)

function CollectionAvatar({ col }) {
  const [imgOk, setImgOk] = useState(!!col.image)
  const initials = col.name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('')

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {imgOk ? (
        <img
          src={col.image}
          alt={col.name}
          onError={() => setImgOk(false)}
          style={{ width: 80, height: 44, borderRadius: 12, objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'rgba(139,92,246,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: '#a78bfa',
        }}>{initials}</div>
      )}
      <div style={{
        position: 'absolute', inset: -2, borderRadius: 14,
        border: '1.5px solid rgba(139,92,246,0.35)',
        pointerEvents: 'none',
      }}/>
    </div>
  )
}

export default function CollectionHeader({
  col, total, onBack,
  models, sortedModels, backdrops, rarity, modelImageUrl, modelImageFallback,
  modelFilter, backdropFilter, handleModelFilter, handleBackdropFilter, resetFilters,
  dropdownOpen, backdropOpen, openModel, openColor,
  modelQuery, setModelQuery, backdropQuery, setBackdropQuery,
}) {
  return (
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        padding: 'calc(12px + var(--tg-top)) 16px 12px',
        background: 'linear-gradient(180deg, rgba(88,28,220,0.18) 0%, rgba(60,10,160,0.08) 100%)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(139,92,246,0.15)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

          {/* назад */}
          <button
            onClick={onBack}
            style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(139,92,246,0.12)',
              border: '1px solid rgba(139,92,246,0.25)',
              color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <CollectionAvatar col={col} />

          {/* название + счётчик */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '-0.4px',
              lineHeight: 1.3,
              textTransform: 'capitalize',
              margin: 0,
              background: 'linear-gradient(135deg, #ffffff 30%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {col.name}
            </h1>
            {total > 0 && (
              <span style={{
                display: 'inline-block',
                marginTop: 4,
                fontSize: 11,
                fontWeight: 500,
                color: '#a78bfa',
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.25)',
                borderRadius: 999,
                padding: '3px 10px',
                letterSpacing: '0.2px',
                whiteSpace: 'nowrap',
              }}>
                {total} listing{total !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* сброс всех фильтров — виден, только когда что-то выбрано */}
          {(modelFilter.length > 0 || backdropFilter.length > 0) && (
            <button
              onClick={resetFilters}
              aria-label="Reset filters"
              style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                alignSelf: 'flex-end',
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.25)',
                color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18"/>
                <line x1="18" y1="6" x2="6" y2="18"/>
              </svg>
            </button>
          )}

          {/* фильтры: Colors сверху, Model снизу */}
          {(models.length > 0 || backdrops.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, alignItems: 'flex-end', alignSelf: 'flex-end' }}>

              {backdrops.length > 0 && (
                <button
                  onClick={() => { openColor(!backdropOpen); openModel(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px', borderRadius: 999,
                    background: backdropFilter.length ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.12)',
                    border: `1px solid ${backdropFilter.length ? 'rgba(139,92,246,0.45)' : 'rgba(139,92,246,0.25)'}`,
                    color: '#a78bfa', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  {backdropFilter.length ? (
                    // выбранные цвета внахлёст (до 3), дальше — «+N»
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {backdropFilter.slice(0, 3).map((b, i) => (
                        <div key={b} style={{
                          width: 11, height: 11, borderRadius: '50%', flexShrink: 0,
                          marginLeft: i ? -4 : 0,
                          background: backdropCss(b),
                          border: '1px solid #000',
                          boxShadow: `0 0 6px ${backdropCss(b)}88`,
                        }} />
                      ))}
                      {backdropFilter.length > 3 && (
                        <span style={{ marginLeft: 4, fontSize: 11 }}>+{backdropFilter.length - 3}</span>
                      )}
                    </div>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="13.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                        <circle cx="17.5" cy="10.5" r="1" fill="currentColor" stroke="none"/>
                        <circle cx="8.5" cy="7.5" r="1" fill="currentColor" stroke="none"/>
                        <circle cx="6.5" cy="12.5" r="1" fill="currentColor" stroke="none"/>
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
                      </svg>
                      <span>Color</span>
                    </>
                  )}
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                    <polyline points={backdropOpen ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/>
                  </svg>
                </button>
              )}

              {models.length > 0 && (
                <button
                  onClick={() => { openModel(!dropdownOpen); openColor(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px', borderRadius: 999,
                    background: modelFilter.length ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.12)',
                    border: `1px solid ${modelFilter.length ? 'rgba(139,92,246,0.45)' : 'rgba(139,92,246,0.25)'}`,
                    color: '#a78bfa', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="6" x2="20" y2="6"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                    <line x1="11" y1="18" x2="13" y2="18"/>
                  </svg>
                  <span>{
                    modelFilter.length === 0 ? 'Model'
                      : modelFilter.length === 1 ? modelFilter[0]
                      : `Models · ${modelFilter.length}`
                  }</span>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                    <polyline points={dropdownOpen ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/>
                  </svg>
                </button>
              )}

            </div>
          )}
        </div>

        {/* тап мимо открытого списка закрывает его (и не открывает карточку под ним) */}
        {(dropdownOpen || backdropOpen) && (
          <div
            onClick={() => { openModel(false); openColor(false) }}
            style={{ position: 'fixed', inset: 0, zIndex: 25 }}
          />
        )}

        {/* дропдаун цвета фона */}
        {backdropOpen && (
        <ColorDropdown backdrops={backdrops} backdropFilter={backdropFilter} backdropQuery={backdropQuery}
          setBackdropQuery={setBackdropQuery} handleBackdropFilter={handleBackdropFilter} />
      )}

      {/* дропдаун моделей */}
        {dropdownOpen && (
        <ModelDropdown models={models} sortedModels={sortedModels} modelFilter={modelFilter}
          modelQuery={modelQuery} setModelQuery={setModelQuery} handleModelFilter={handleModelFilter}
          modelImageUrl={modelImageUrl} modelImageFallback={modelImageFallback} rarity={rarity} />
      )}
    </div>
  )
}
