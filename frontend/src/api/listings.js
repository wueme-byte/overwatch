const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function fetchListings({ collection, model, minTon, maxTon, marketplace, page = 1, pageSize = 20 }) {
  const params = new URLSearchParams({ collection, page, page_size: pageSize })
  if (model)       params.append('model', model)
  if (minTon)      params.append('min_ton', minTon)
  if (maxTon)      params.append('max_ton', maxTon)
  if (marketplace) params.append('marketplace', marketplace)

  const res = await fetch(`${BASE}/listings?${params}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail ?? 'Request failed')
  }
  return res.json() // { total, page, page_size, items }
}
