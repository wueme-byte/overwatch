const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// Счётчик посетителей: event 'open' (открыл приложение) или 'collection' (открыл коллекцию).
// Тихо: никаких ошибок пользователю, если сервер не ответил.
export function trackVisit(event, collection) {
  try {
    // initData подписана Telegram — сервер проверит подпись и только тогда поверит, кто это
    const init_data = window.Telegram?.WebApp?.initData || null
    fetch(`${BASE}/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, collection: collection ?? null, init_data }),
      keepalive: true,
    }).catch(() => {})
  } catch {}
}
