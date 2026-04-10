import { useState } from 'react'

function CollectionAvatar({ col }) {
  const [imgOk, setImgOk] = useState(!!col.image)
  const initials = col.name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('')

  return imgOk ? (
    <img
      src={col.image}
      alt={col.name}
      className="w-full h-full object-cover"
      onError={() => setImgOk(false)}
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-gray-300">
      {initials}
    </div>
  )
}

export default function CollectionCard({ col, onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col active:scale-[0.94] transition-transform w-full"
    >
      <div className="relative overflow-hidden w-full" style={{ borderRadius: 16 }}>

          {/* картинка */}
          <div className="w-full aspect-square relative" style={{
            filter: 'saturate(1.1) contrast(1.05)',
          }}>
            <CollectionAvatar col={col} />
          </div>

          {/* фиолетовый оверлей сверху */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'linear-gradient(160deg, rgba(88,28,220,0.22) 0%, transparent 55%)'
          }}/>

          {/* свечение снизу */}
          <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{
            height: 40,
            background: 'linear-gradient(to top, rgba(109,40,217,0.5) 0%, transparent 100%)',
          }}/>

          {/* градиент снизу + название поверх */}
          <div className="absolute bottom-0 left-0 right-0" style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
            padding: '20px 6px 5px',
          }}>
            <span style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.9)',
              fontWeight: 500,
              textTransform: 'capitalize',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {col.name}
            </span>
          </div>


      </div>
    </button>
  )
}
