export default function ListingCard({ item }) {
  const isFragment = item.marketplace === 'Fragment'

  return (
    <a
      href={item.listing_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] active:scale-[0.98] transition-all"
    >
      {/* left: name + model */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate">{item.name}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{item.model}</p>
      </div>

      {/* right: price + marketplace */}
      <div className="flex flex-col items-end shrink-0 gap-1">
        <p className="text-sm font-semibold text-sky-300">{Number(item.price_ton).toFixed(2)} TON</p>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          style={{
            background: isFragment ? 'rgba(251,191,36,0.1)' : 'rgba(56,189,248,0.1)',
            color: isFragment ? '#fbbf24' : '#7dd3fc',
            border: `1px solid ${isFragment ? 'rgba(251,191,36,0.2)' : 'rgba(56,189,248,0.2)'}`,
          }}
        >
          {isFragment ? 'Fragment' : 'Getgems'}
        </span>
      </div>
    </a>
  )
}
