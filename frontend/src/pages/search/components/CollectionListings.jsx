import { useState, useEffect, useRef } from 'react'
import { fetchListings, checkLive } from '../../../api/listings'
import { trackVisit } from '../../../api/visit'
import { rarityRank } from '../../../lib/rarity'
import { useRarity } from '../../../hooks/useRarity'
import ListingCard from './ListingCard'
import ModelsSheet from './ModelsSheet'
import CollectionHeader from './collection/CollectionHeader'
import { LoadingTerminal, LoadError, EmptyList, Pager } from './collection/ListStates'

// Экран коллекции: данные, фильтры, живое сгорание и добор снизу.
// Вёрстка шапки, списков фильтров и состояний — в ./collection/ (В8).

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

const toggle = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]

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
  const [sheetModel, setSheetModel]         = useState(null)   // открыта шторка моделей (для этой модели)
  // живой список: адрес → 'burned' | 'sold' | 'gone' (карточка играет анимацию и пропадает)
  const [fates, setFates]                   = useState({})
  const scrollRef                           = useRef(null)
  const refillTimer                         = useRef(null)
  const rarity = useRarity(col.name, models)

  // какой запрос списка завершился последним (ключ параметров) и с какой ошибкой.
  // «Идёт загрузка» = последний завершённый запрос не совпадает с текущими параметрами.
  const paramsKey = JSON.stringify([col.name, page, modelFilter, backdropFilter])
  const [done, setDone]                     = useState({ key: null, error: null })
  const [reloadTick, setReloadTick]         = useState(0)    // «Try again» → +1
  const loading = done.key !== paramsKey
  const error = loading ? null : done.error

  // свежие значения для таймеров и асинхронных ответов (обновляются после отрисовки)
  const fatesRef  = useRef(fates)
  const itemsRef  = useRef(items)
  const paramsRef = useRef(paramsKey)
  useEffect(() => { fatesRef.current = fates; itemsRef.current = items; paramsRef.current = paramsKey })

  // счётчик: кто какую коллекцию открыл
  useEffect(() => { trackVisit('collection', col.name) }, [col.name])

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

  // загрузка страницы списка при смене коллекции / страницы / фильтров / «Try again»
  useEffect(() => {
    let alive = true
    const key = JSON.stringify([col.name, page, modelFilter, backdropFilter])
    fetchListings({ collection: col.name, page, pageSize: PAGE_SIZE, model: modelFilter, backdrop: backdropFilter })
      .then(data => {
        if (!alive) return
        setItems(data.items)
        setTotal(data.total)
        setFates({})
        if (data.models && data.models.length > 0) setModels(prev => prev.length > 0 ? prev : data.models.map(m => typeof m === 'string' ? { name: m, image: null } : m))
        if (data.backdrops && data.backdrops.length > 0) setBackdrops(prev => prev.length > 0 ? prev : data.backdrops)
        setDone({ key, error: null })
      })
      .catch(e => { if (alive) setDone({ key, error: e.message }) })
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    return () => { alive = false }
  }, [col.name, page, modelFilter, backdropFilter, reloadTick])

  const retry = () => { setDone({ key: null, error: null }); setReloadTick(t => t + 1) }

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
  }, [paramsKey, loading, error, col.name])

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
            // _entering: карточка добралась снизу — при появлении сыграет «въезд»
            return [...kept, ...add.map(x => ({ ...x, _entering: true }))]
          })
          setTotal(data.total)
        })
        .catch(() => {})
    }, 300)
  }

  // открыть/закрыть списки фильтров; при закрытии стираем набранный в них поиск
  const openModel = open => { setDropdownOpen(open); if (!open) setModelQuery('') }
  const openColor = open => { setBackdropOpen(open); if (!open) setBackdropQuery('') }

  // null — сбросить («All …») и закрыть список; значение — добавить/убрать.
  // Первый выбор (когда ещё ничего не выбрано) закрывает список — обычно ищут
  // одну модель/цвет. Если уже что-то выбрано — список остаётся открытым,
  // чтобы можно было набрать несколько
  function handleModelFilter(m) {
    const first = modelFilter.length === 0
    setModelFilter(prev => m === null ? [] : toggle(prev, m))
    setPage(1)
    if (m === null || first) openModel(false)
  }

  function handleBackdropFilter(b) {
    const first = backdropFilter.length === 0
    setBackdropFilter(prev => b === null ? [] : toggle(prev, b))
    setPage(1)
    if (b === null || first) openColor(false)
  }

  // кнопка ✕ в шапке: сбросить и модели, и цвета разом
  function resetFilters() {
    setModelFilter([])
    setBackdropFilter([])
    setPage(1)
    openModel(false)
    openColor(false)
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

      <CollectionHeader
        col={col} total={total} onBack={onBack}
        models={models} sortedModels={sortedModels} backdrops={backdrops} rarity={rarity}
        modelImageUrl={modelImageUrl} modelImageFallback={modelImageFallback}
        modelFilter={modelFilter} backdropFilter={backdropFilter}
        handleModelFilter={handleModelFilter} handleBackdropFilter={handleBackdropFilter} resetFilters={resetFilters}
        dropdownOpen={dropdownOpen} backdropOpen={backdropOpen} openModel={openModel} openColor={openColor}
        modelQuery={modelQuery} setModelQuery={setModelQuery}
        backdropQuery={backdropQuery} setBackdropQuery={setBackdropQuery}
      />

      {/* Тап мимо открытого списка фильтра (по лотам ниже шапки) закрывает его и не открывает
          карточку под ним. Подложка внутри шапки этого не умеет: из-за backdropFilter шапки её
          position: fixed накрывает только саму шапку. Эта — поверх списка (zIndex 10),
          но под шапкой со списками (zIndex 20). */}
      {(dropdownOpen || backdropOpen) && (
        <div
          onClick={() => { openModel(false); openColor(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 15 }}
        />
      )}

      {/* ── список ── */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 32px', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {loading && <LoadingTerminal />}

        {error && <LoadError onRetry={retry} />}

        {items && !loading && (
          <>
            {items.length === 0 ? <EmptyList /> : (
              items.map((item, i) => (
                <ListingCard
                  key={item.nft_address || `${item.name}-${i}`}
                  item={item}
                  isBest={i === 0 && page === 1}
                  rarity={item.model ? rarity[item.model] : undefined}
                  modelImages={modelImageSources(item.model)}
                  onRarityClick={setSheetModel}
                  fate={item.nft_address ? fates[item.nft_address] : undefined}
                  entering={!!item._entering}
                  onFateDone={() => handleFateDone(item.nft_address)}
                />
              ))
            )}

            {totalPages > 1 && <Pager page={page} totalPages={totalPages} setPage={setPage} />}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
