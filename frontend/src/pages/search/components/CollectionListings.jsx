import { useState, useEffect, useRef } from 'react'
import { fetchListings, fetchRarity, checkLive } from '../../../api/listings'
import ListingCard, { rarityColor, rarityRank } from './ListingCard'
import ModelsSheet from './ModelsSheet'
import { backdropCss } from '../../../lib/backdropColors'

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

const PAGE_SIZE = 15
// как часто спрашиваем сервер, не сгорели/не продались ли карточки на экране
const LIVE_POLL_MS = 12000
const LIVE_FIRST_MS = 3000

const BG = (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
    <div style={{
      position: 'absolute', top: '-10%', left: '-10%',
      width: 320, height: 320, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 70%)',
    }}/>
    <div style={{
      position: 'absolute', bottom: '5%', right: '-15%',
      width: 280, height: 280, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(3,105,161,0.14) 0%, transparent 70%)',
    }}/>
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    }}/>
  </div>
)

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

export default function CollectionListings({ col, onBack }) {
  const [items, setItems]                   = useState(null)
  const [total, setTotal]                   = useState(0)
  const [page, setPage]                     = useState(1)
  const [models, setModels]                 = useState([])
  const [backdrops, setBackdrops]           = useState([])
  // мультивыбор: массивы выбранных моделей/цветов; пустой массив = «все»
  const [modelFilter, setModelFilter]       = useState([])
  const [backdropFilter, setBackdropFilter] = useState([])
  const [dropdownOpen, setDropdownOpen]     = useState(false)
  const [backdropOpen, setBackdropOpen]     = useState(false)
  // текст в строке поиска внутри списков; стирается при закрытии списка
  const [modelQuery, setModelQuery]         = useState('')
  const [backdropQuery, setBackdropQuery]   = useState('')
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState(null)
  const scrollRef                           = useRef(null)
  const [rarity, setRarity]                 = useState({})
  const [sheetModel, setSheetModel]         = useState(null)   // открыта шторка моделей (для этой модели)
  // живой список: адрес → 'burned' | 'sold' | 'gone' (карточка играет анимацию и пропадает)
  const [fates, setFates]                   = useState({})
  const fatesRef                            = useRef({})
  fatesRef.current = fates
  const itemsRef                            = useRef(null)
  itemsRef.current = items
  const enteringRef                         = useRef(new Set())   // адреса, добравшиеся снизу
  const refillTimer                         = useRef(null)
  const paramsKey = JSON.stringify([col.name, page, modelFilter, backdropFilter])
  const paramsRef                           = useRef(paramsKey)
  paramsRef.current = paramsKey

  // редкость грузим отдельно, чтобы не задерживать список.
  // Сервер собирает её со страниц t.me и не всегда успевает за раз —
  // пока не у всех моделей есть редкость, переспрашиваем (каждые 5 с, до 2 минут)
  const modelsRef = useRef([])
  modelsRef.current = models
  useEffect(() => {
    let alive = true, tries = 0, timer
    setRarity({})
    const again = () => { if (alive && ++tries < 24) timer = setTimeout(load, 5000) }
    const load = () => fetchRarity(col.name)
      .then(r => {
        if (!alive) return
        r = r || {}
        setRarity(r)
        const ms = modelsRef.current
        if (ms.length === 0 || ms.some(m => !(m.name in r))) again()
      })
      .catch(again)
    load()
    return () => { alive = false; clearTimeout(timer) }
  }, [col.name])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // иконка модели без фона (та же, что в фильтре по модели)
  // Источники по порядку: иконка GetGems; если её нет (у новых крафтовых моделей
  // GetGems отдаёт 403) — картинка модели с cdn.changes.tg. Там папка названа по
  // имени подарка в единственном числе ("Myth Mask"), берём его из имени лота.
  const modelImageUrl = name => col.address && name
    ? `https://ddejfvww7sqtk.cloudfront.net/images/attrs/${col.address}/${btoa(unescape(encodeURIComponent(name)))}.webp`
    : null
  const giftBase = (items?.[0]?.name || '').split(' #')[0]
  const modelImageFallback = name => giftBase && name
    ? `https://cdn.changes.tg/gifts/models/${encodeURIComponent(giftBase)}/png/${encodeURIComponent(name)}.png`
    : null
  const modelImageSources = name => [modelImageUrl(name), modelImageFallback(name)].filter(Boolean)

  // в фильтре модели идут от самой редкой к обычной; пока редкость
  // не пришла (или её нет) — такие модели в конце, по алфавиту
  const rank = name => rarityRank(rarity[name])
  const sortedModels = [...models].sort((a, b) => (rank(a.name) - rank(b.name)) || a.name.localeCompare(b.name))

  useEffect(() => {
    setLoading(true)
    setError(null)
    setFates({})
    enteringRef.current = new Set()
    fetchListings({ collection: col.name, page, pageSize: PAGE_SIZE, model: modelFilter, backdrop: backdropFilter })
      .then(data => {
        setItems(data.items)
        setTotal(data.total)
        if (data.models && data.models.length > 0) setModels(prev => prev.length > 0 ? prev : data.models.map(m => typeof m === 'string' ? { name: m, image: null } : m))
        if (data.backdrops && data.backdrops.length > 0) setBackdrops(prev => prev.length > 0 ? prev : data.backdrops)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [col.name, page, modelFilter, backdropFilter])

  // Живой список: раз в 12 с спрашиваем сервер про карточки на экране.
  // Сгоревшие/проданные играют анимацию, место схлопывается, снизу добирается следующий лот.
  useEffect(() => {
    if (loading || error) return
    let alive = true, timer
    const poll = async () => {
      if (!alive) return
      const shown = (itemsRef.current || []).filter(x => x.nft_address && !fatesRef.current[x.nft_address])
      if (!document.hidden && shown.length) {
        try {
          const st = await checkLive(col.name, shown)
          if (alive && Object.keys(st).length) setFates(f => ({ ...f, ...st }))
        } catch { /* сеть моргнула — спросим в следующий раз */ }
      }
      if (alive) timer = setTimeout(poll, LIVE_POLL_MS)
    }
    timer = setTimeout(poll, LIVE_FIRST_MS)
    return () => { alive = false; clearTimeout(timer) }
  }, [paramsKey, loading, error])

  useEffect(() => () => clearTimeout(refillTimer.current), [])

  // карточка доиграла анимацию и схлопнулась — убираем её и добираем список с сервера
  const handleFateDone = addr => {
    setItems(list => list ? list.filter(x => x.nft_address !== addr) : list)
    clearTimeout(refillTimer.current)
    refillTimer.current = setTimeout(() => {
      const key = paramsRef.current
      // Берём выдачу с начала и до конца текущей страницы (+ запас), чтобы найти,
      // какой лот идёт следом за последней карточкой на экране.
      const size = Math.min(500, page * PAGE_SIZE + 10)
      fetchListings({ collection: col.name, page: 1, pageSize: size, model: modelFilter, backdrop: backdropFilter })
        .then(data => {
          if (key !== paramsRef.current) return   // пользователь уже ушёл на другую страницу/фильтр
          setItems(cur => {
            // карточки на экране остаются на своих местах (и те, что ещё доигрывают анимацию)
            const kept = cur || []
            const shown = new Set(kept.map(x => x.nft_address))
            const living = kept.filter(x => !fatesRef.current[x.nft_address])
            const room = PAGE_SIZE - living.length
            if (room <= 0) return kept
            // следующие — те, что в выдаче стоят после последней живой карточки.
            // Новые дешёвые лоты наверх посреди просмотра не вставляем.
            const lastAddr = living.length ? living[living.length - 1].nft_address : null
            const from = lastAddr ? data.items.findIndex(x => x.nft_address === lastAddr) + 1 : 0
            const pool = from > 0 ? data.items.slice(from) : data.items.slice(Math.max(0, (page - 1) * PAGE_SIZE))
            const add = pool.filter(x => !shown.has(x.nft_address) && !fatesRef.current[x.nft_address]).slice(0, room)
            add.forEach(x => enteringRef.current.add(x.nft_address))
            return [...kept, ...add]
          })
          setTotal(data.total)
        })
        .catch(() => {})
    }, 300)
  }

  // список закрылся — стираем набранный в нём поиск
  useEffect(() => { if (!dropdownOpen) setModelQuery('') }, [dropdownOpen])
  useEffect(() => { if (!backdropOpen) setBackdropQuery('') }, [backdropOpen])

  // null — сбросить («All …») и закрыть список; значение — добавить/убрать.
  // Первый выбор (когда ещё ничего не выбрано) закрывает список — обычно ищут
  // одну модель/цвет. Если уже что-то выбрано — список остаётся открытым,
  // чтобы можно было набрать несколько
  const toggle = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]

  function handleModelFilter(m) {
    const first = modelFilter.length === 0
    setModelFilter(prev => m === null ? [] : toggle(prev, m))
    setPage(1)
    if (m === null || first) setDropdownOpen(false)
  }

  function handleBackdropFilter(b) {
    const first = backdropFilter.length === 0
    setBackdropFilter(prev => b === null ? [] : toggle(prev, b))
    setPage(1)
    if (b === null || first) setBackdropOpen(false)
  }

  // кнопка ✕ в шапке: сбросить и модели, и цвета разом
  function resetFilters() {
    setModelFilter([])
    setBackdropFilter([])
    setPage(1)
    setDropdownOpen(false)
    setBackdropOpen(false)
  }

  return (
    <div style={{ background: '#080808', height: '100svh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {BG}

      {sheetModel && (
        <ModelsSheet
          title={col.name}
          rarity={rarity}
          available={models.map(m => m.name)}
          selected={sheetModel}
          imageSources={modelImageSources}
          onPick={m => { setModelFilter([m]); setPage(1); setSheetModel(null) }}
          onClose={() => setSheetModel(null)}
        />
      )}

      {/* ── шапка ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        padding: '12px 16px 12px',
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
                  onClick={() => { setBackdropOpen(o => !o); setDropdownOpen(false) }}
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
                  onClick={() => { setDropdownOpen(o => !o); setBackdropOpen(false) }}
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
            onClick={() => { setDropdownOpen(false); setBackdropOpen(false) }}
            style={{ position: 'fixed', inset: 0, zIndex: 25 }}
          />
        )}

        {/* дропдаун цвета фона */}
        {backdropOpen && (
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
        )}

        {/* дропдаун моделей */}
        {dropdownOpen && (
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
        )}
      </div>

      {/* ── список ── */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 32px', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 20px', gap: 32 }}>

            {/* terminal block */}
            <div style={{
              width: '100%', maxWidth: 280,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(139,92,246,0.15)',
              borderRadius: 14, padding: '16px 18px',
              fontFamily: 'monospace',
            }}>
              {/* title bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 6px #a78bfa', animation: 'termCursor 1.2s ease-in-out infinite' }}/>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.08em' }}>overwatch ~ scan</span>
              </div>

              {/* lines */}
              {[
                { text: '> Connecting to Fragment...', suffix: '✓', suffixColor: '#4ade80', delay: '0s' },
                { text: '> Connecting to GetGems...', suffix: '✓', suffixColor: '#4ade80', delay: '0.6s' },
                { text: '> Connecting to MRKT...', suffix: '✓', suffixColor: '#4ade80', delay: '1.2s' },
                { text: '> Connecting to Portals...', suffix: '✓', suffixColor: '#4ade80', delay: '1.8s' },
                { text: '> Fetching listings...', suffix: null, delay: '2.4s' },
              ].map((line, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 11, marginBottom: 8,
                  opacity: 0, animation: `termLine 0.3s ${line.delay} forwards`,
                }}>
                  <span style={{ color: 'rgba(167,139,250,0.6)' }}>{line.text}</span>
                  {line.suffix
                    ? <span style={{ color: line.suffixColor, marginLeft: 8 }}>{line.suffix}</span>
                    : <span style={{ color: '#a78bfa', animation: 'termCursor 0.8s ease-in-out infinite' }}>█</span>
                  }
                </div>
              ))}
            </div>

            {/* hint */}
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.1)', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
              First load may take up to 30 sec<br/>while we scan all marketplaces
            </p>

            <style>{`
              @keyframes termLine {
                from { opacity: 0; transform: translateX(-6px); }
                to   { opacity: 1; transform: translateX(0); }
              }
              @keyframes termCursor {
                0%, 100% { opacity: 1; }
                50%       { opacity: 0; }
              }
            `}</style>
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 14, padding: '16px', color: '#f87171', fontSize: 13,
            display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', textAlign: 'center',
          }}>
            <span>Failed to load listings. Please try again.</span>
            <button
              onClick={() => {
                setError(null)
                setLoading(true)
                fetchListings({ collection: col.name, page, pageSize: PAGE_SIZE, model: modelFilter, backdrop: backdropFilter })
                  .then(data => { setItems(data.items); setTotal(data.total) })
                  .catch(e => setError(e.message))
                  .finally(() => setLoading(false))
              }}
              style={{
                padding: '7px 20px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171', cursor: 'pointer',
              }}
            >Try again</button>
          </div>
        )}

        {items && !loading && (
          <>
            {items.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No listings found</p>
              </div>
            ) : (
              items.map((item, i) => (
                <ListingCard
                  key={item.nft_address || `${item.name}-${i}`}
                  item={item}
                  isBest={i === 0 && page === 1}
                  rarity={item.model ? rarity[item.model] : undefined}
                  modelImages={modelImageSources(item.model)}
                  onRarityClick={setSheetModel}
                  fate={item.nft_address ? fates[item.nft_address] : undefined}
                  entering={enteringRef.current.has(item.nft_address)}
                  onFateDone={() => handleFateDone(item.nft_address)}
                />
              ))
            )}

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 8 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: page === 1 ? 'rgba(255,255,255,0.15)' : '#a78bfa',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: page === 1 ? 'default' : 'pointer',
                    transition: 'opacity 150ms',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>

                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.5px' }}>
                  <span style={{ color: '#a78bfa', fontWeight: 600 }}>{page}</span>
                  <span style={{ margin: '0 4px' }}>/</span>
                  {totalPages}
                </span>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: page === totalPages ? 'rgba(255,255,255,0.15)' : '#a78bfa',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: page === totalPages ? 'default' : 'pointer',
                    transition: 'opacity 150ms',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
