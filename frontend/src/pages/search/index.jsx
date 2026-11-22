import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCollections } from '../../api/collections'
import AnimatedSearch from './components/AnimatedSearch'
import CollectionCard from './components/CollectionCard'
import CollectionListings from './components/CollectionListings'

const BG = (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
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
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    }}/>
  </div>
)

// Новинки: поднимаются в начало списка и получают плашку NEW.
// Порядок в массиве = порядок на экране. Сравнение по основе слова,
// чтобы пережить переименование вида «Myth Mask» → «Myth Masks».
const NEW_COLLECTIONS = ['resistance dog', 'myth mask']

const isNewCollection = col =>
  NEW_COLLECTIONS.some(n => col.name.toLowerCase().includes(n))

// Закреплённые сразу после новинок — без плашки NEW, порядок в массиве = порядок на экране
const PINNED_COLLECTIONS = ['plush pepe']

// Порядок: новинки → закреплённые → остальные как пришли → Toy Bears в конце
const collectionRank = col => {
  const name = col.name.toLowerCase()
  const top = NEW_COLLECTIONS.length + PINNED_COLLECTIONS.length
  const i = NEW_COLLECTIONS.findIndex(n => name.includes(n))
  if (i !== -1) return i - top
  const j = PINNED_COLLECTIONS.findIndex(n => name.includes(n))
  if (j !== -1) return NEW_COLLECTIONS.length + j - top
  return name.includes('toy bear') ? 1 : 0
}

export default function Search() {
  const navigate = useNavigate()

  const [exiting, setExiting]         = useState(false)
  const [collections, setCollections] = useState([])
  const [searchOpen, setSearchOpen]   = useState(false)
  const [loadingCols, setLoadingCols] = useState(true)
  const [filter, setFilter]           = useState('')
  const [selected, setSelected]       = useState(null)

  useEffect(() => {
    fetchCollections()
      .then(setCollections)
      .catch(() => {})
      .finally(() => setLoadingCols(false))
  }, [])

  const filtered = collections
    .filter(c => c.name.toLowerCase().includes(filter.toLowerCase().trim()))
    .sort((a, b) => collectionRank(a) - collectionRank(b))

  if (selected) {
    return <CollectionListings col={selected} onBack={() => { setSelected(null); setFilter('') }} />
  }

  return (
    <div className={exiting ? 'page-exit' : 'page-enter'} style={{ background: '#080808', height: '100svh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {BG}

      {/* header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          paddingTop: 13,
          paddingBottom: 12,
          // отступы заданы явно: классы Tailwind px-* перебивает сброс * { padding: 0 } в index.css
          paddingLeft: 16,
          paddingRight: 16,
          background: 'linear-gradient(180deg, rgba(88,28,220,0.18) 0%, rgba(60,10,160,0.08) 100%)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(139,92,246,0.15)',
        }}
      >
        {/* одна строка: «назад» · Gifts + счётчик · лупа справа.
            Поиск раскрывается на всю строку поверх заголовка. */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, height: 38 }}>
          <button
            onClick={() => { setExiting(true); setTimeout(() => navigate(-1), 300) }}
            className="back-btn"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(139,92,246,0.12)',
              border: '1px solid rgba(139,92,246,0.25)',
              color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, minWidth: 0,
            opacity: searchOpen ? 0 : 1,
            transition: 'opacity 200ms ease',
          }}>
            <h1 style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '-0.5px',
              lineHeight: 1,
              background: 'linear-gradient(135deg, #ffffff 30%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0,
            }}>Gifts</h1>
            {!loadingCols && (
              <span style={{
                fontSize: 11,
                fontWeight: 500,
                color: '#a78bfa',
                background: 'rgba(139,92,246,0.12)',
                border: '1px solid rgba(139,92,246,0.25)',
                borderRadius: 999,
                padding: '3px 10px',
                letterSpacing: '0.2px',
              }}>{collections.length} collections</span>
            )}
          </div>

          {/* слой поиска: от кнопки «назад» до правого края, лупа прижата вправо */}
          <div style={{
            position: 'absolute', left: 44, right: 0, top: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            pointerEvents: 'none',
          }}>
            <AnimatedSearch value={filter} onChange={setFilter} onExpandedChange={setSearchOpen} />
          </div>
        </div>
      </div>

      {/* грид коллекций */}

      <div className="flex-1 overflow-y-auto relative z-10" style={{ paddingTop: 10, paddingLeft: 16, paddingRight: 16, paddingBottom: 32 }}>
        {loadingCols ? (
          <div className="flex items-center justify-center py-20 gap-3 text-sm" style={{ color: 'rgba(167,139,250,0.5)' }}>
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            Loading collections...
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {filtered.map((col) => (
              <CollectionCard
                key={col.address || col.name}
                col={col}
                isNew={isNewCollection(col)}
                onClick={() => setSelected(col)}
              />
            ))}

            {filtered.length === 0 && (
              <div className="col-span-4 flex justify-center py-16">
                <p className="text-gray-600 text-sm">Nothing found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
