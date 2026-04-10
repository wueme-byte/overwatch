const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function fetchCollections() {
  const res = await fetch(`${BASE}/collections`)
  if (!res.ok) throw new Error('Failed to load collections')
  return res.json() // [{ name, address, image }]
}
