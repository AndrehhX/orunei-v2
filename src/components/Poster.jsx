import { useState } from 'react'
import { useImages } from '../images'
// Image priority: manual `img` > AniList (banner if `wide`, else cover) > gradient fallback.
export default function Poster({ img, q, wide, grad, title, className = '', children, onClick }) {
  const [bad, setBad] = useState(false)
  const [ok, setOk] = useState(false)
  const found = useImages()[q]
  const src = img || (wide ? found?.banner || found?.cover : found?.cover)
  const pos = /\babsolute\b/.test(className) ? '' : 'relative'
  return (
    <div onClick={onClick} className={`${pos} overflow-hidden group/poster ${className}`} style={{ backgroundImage: grad }}>
      {src && !bad ? (
        <>
          {!ok && <div className="absolute inset-0 skeleton-shimmer" />}
          <img src={src} alt={title} loading="lazy" decoding="async" onLoad={() => setOk(true)} onError={() => setBad(true)}
            className={`absolute inset-0 h-full w-full object-cover transform-gpu transition-[transform,opacity] duration-500 ease-out group-hover:scale-105 group-hover/poster:scale-105 ${ok ? 'opacity-100' : 'opacity-0 scale-105'}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none opacity-40 group-hover:opacity-20 transition-opacity duration-300" />
        </>
      ) : (
        title && <span className="absolute inset-0 flex items-end p-2 text-[11px] font-bold text-white/80 drop-shadow">{title}</span>
      )}
      {children}
    </div>
  )
}
