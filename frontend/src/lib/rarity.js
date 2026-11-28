// Редкость моделей: общие функции для карточки, фильтра моделей и шторки.
// (В8: вынесено из ListingCard.jsx — файл компонента должен экспортировать только компоненты)

// Уровни редкости крафтовых подарков (вместо процента у них слово)
const CRAFT_TIERS = {
  legendary: { rank: -4, color: '#fbbf24' },   // золото
  epic:      { rank: -3, color: '#c084fc' },   // фиолетовый
  rare:      { rank: -2, color: '#7dd3fc' },   // голубой
  uncommon:  { rank: -1, color: '#4ade80' },   // зелёный
}
const craftTier = r => CRAFT_TIERS[String(r ?? '').trim().toLowerCase()]

// Для сортировки «от редких к обычным»: крафтовые уровни идут первыми
// (Legendary → Uncommon), затем проценты по возрастанию, без данных — в конце
export function rarityRank(r) {
  const tier = craftTier(r)
  if (tier) return tier.rank
  const v = parseFloat(String(r ?? '').replace(',', '.'))
  return Number.isFinite(v) ? v : Infinity
}

// Цвет редкости: чем реже, тем «дороже» цвет
export function rarityColor(pct) {
  const tier = craftTier(pct)
  if (tier) return tier.color
  const v = parseFloat(String(pct).replace(',', '.'))
  if (v <= 0.5) return '#fbbf24'   // золото
  if (v <= 1)   return '#c084fc'   // фиолетовый
  if (v <= 2)   return '#7dd3fc'   // голубой
  return 'rgba(255,255,255,0.45)'
}
