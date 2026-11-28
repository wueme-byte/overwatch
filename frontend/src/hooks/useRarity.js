import { useState, useEffect, useRef } from 'react'
import { fetchRarity } from '../api/listings'

// Редкость моделей коллекции { "Hue Jester": "3%" }.
// Грузим отдельно, чтобы не задерживать список. Сервер собирает её со страниц t.me
// и не всегда успевает за раз — пока не у всех моделей есть редкость, переспрашиваем
// (каждые 5 с, до 2 минут). Новая коллекция = новый экран (key в Search), поэтому
// сбрасывать редкость при смене коллекции не нужно.
// (В8: вынесено из CollectionListings.jsx)
export function useRarity(collectionName, models) {
  const [rarity, setRarity] = useState({})
  const modelsRef = useRef(models)
  useEffect(() => { modelsRef.current = models })

  useEffect(() => {
    let alive = true, tries = 0, timer
    const again = () => { if (alive && ++tries < 24) timer = setTimeout(load, 5000) }
    const load = () => fetchRarity(collectionName)
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
  }, [collectionName])

  return rarity
}
