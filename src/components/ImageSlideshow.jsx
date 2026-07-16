// Product image slideshow — crossfading slides with arrows, dots and thumbnails.
// Renders a plain <img> when there's only one image, so it's safe to use everywhere.
import { useEffect, useRef, useState } from 'react'

const AUTO_ADVANCE_MS = 5000

export default function ImageSlideshow({ images, alt, frameClass = '' }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef(null)

  const count = images.length

  useEffect(() => {
    if (count < 2 || paused) return
    timer.current = setInterval(() => setIndex(i => (i + 1) % count), AUTO_ADVANCE_MS)
    return () => clearInterval(timer.current)
  }, [count, paused])

  function goTo(i) {
    setIndex((i + count) % count)
  }

  if (count === 0) {
    return (
      <div className={`aspect-square flex items-center justify-center text-rose-dust/40 text-sm ${frameClass}`}>
        No image
      </div>
    )
  }

  if (count === 1) {
    return (
      <div className={frameClass}>
        <img src={images[0]} alt={alt} className="w-full object-cover aspect-square" />
      </div>
    )
  }

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className={`relative aspect-square overflow-hidden ${frameClass}`}>
        {images.map((url, i) => (
          <img
            key={url}
            src={url}
            alt={`${alt} — photo ${i + 1}`}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{ opacity: i === index ? 1 : 0 }}
          />
        ))}

        {/* prev / next arrows */}
        <button
          onClick={() => goTo(index - 1)}
          aria-label="Previous photo"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full
                     bg-black/35 hover:bg-black/55 text-cream backdrop-blur-sm
                     flex items-center justify-center transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => goTo(index + 1)}
          aria-label="Next photo"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full
                     bg-black/35 hover:bg-black/55 text-cream backdrop-blur-sm
                     flex items-center justify-center transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* dot indicators */}
        <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Photo ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300
                          ${i === index ? 'w-5 bg-cream' : 'w-1.5 bg-cream/50 hover:bg-cream/80'}`}
            />
          ))}
        </div>
      </div>

      {/* thumbnail strip */}
      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
        {images.map((url, i) => (
          <button
            key={url}
            onClick={() => goTo(i)}
            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-300
                        ${i === index ? 'border-rose-dust' : 'border-transparent opacity-60 hover:opacity-100'}`}
          >
            <img src={url} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  )
}
