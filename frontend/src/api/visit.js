const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// Счётчик посетителей: event 'open' (открыл приложение) или 'collection' (открыл коллекцию).
// Тихо: никаких ошибок пользователю, если сервер не ответил.
export function trackVisit(event, collection) {
  try {
    const u = window.Telegram?.WebApp?.initDataUnsafe?.user
    const user = u ? { id: u.id, username: u.username, first_name: u.first_name, last_name: u.last_name } : null
    fetch(`${BASE}/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, collection: collection ?? null, user }),
      keepalive: true,
    }).catch(() => {})
  } catch {}
}
