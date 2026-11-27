const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function fetchListings({ collection, model, backdrop, minTon, maxTon, page = 1, pageSize = 20 }) {
  const params = new URLSearchParams({ collection, page, page_size: pageSize })
  // model/backdrop: строка или массив (мультивыбор) → ?model=A&model=B
  for (const m of [].concat(model ?? []))    params.append('model', m)
  for (const b of [].concat(backdrop ?? [])) params.append('backdrop', b)
  if (minTon)   params.append('min_ton', minTon)
  if (maxTon)   params.append('max_ton', maxTon)

  const res = await fetch(`${BASE}/listings?${params}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail ?? 'Request failed')
  }
  return res.json() // { total, page, page_size, items }
}

// Редкость моделей { "Hue Jester": "3%" }; первый раз собирается несколько секунд
export async function fetchRarity(collection) {
  const res = await fetch(`${BASE}/rarity?${new URLSearchParams({ collection })}`)
  if (!res.ok) return {}
  return res.json()
}

// Живые статусы карточек на экране: { адрес: "burned" | "sold" | "gone" } — только пропавшие
export async function checkLive(collection, items) {
  const res = await fetch(`${BASE}/listings/live`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      collection,
      items: items.map(x => ({ address: x.nft_address, name: x.name, price_ton: x.price_ton })),
    }),
  })
  if (!res.ok) return {}
  const data = await res.json()
  return data.status || {}
}
