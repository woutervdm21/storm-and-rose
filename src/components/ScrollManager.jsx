// Owns the scroll position across route changes.
//
// React Router never moves the scroll bar itself, and the browser's own
// restoration runs while the next page is still a single "Loading..." line.
// A one-line page cannot hold the offset the storefront had, so the browser
// clamps it to the bottom — which is why opening a candle flashed the footer,
// and why going back landed there too. We keep the positions ourselves and
// put them back once the page has grown tall enough to hold them.
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// the navbar is fixed, so an anchored section has to clear it
const NAVBAR_HEIGHT = 68

// how long we keep re-applying the offset while the page loads (~1s at 60fps)
const MAX_FRAMES = 60

// scroll offset of every history entry visited this session, by location.key
const positions = new Map()

export default function ScrollManager() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const restoring = useRef(false)

  // record where each entry is scrolled to, so going back can restore it.
  // our own scrolling fires this too, so it pauses while we are restoring
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    const record = () => {
      if (!restoring.current) positions.set(location.key, window.scrollY)
    }
    window.addEventListener('scroll', record, { passive: true })
    return () => window.removeEventListener('scroll', record)
  }, [location.key])

  // runs before the browser paints, so the clamped offset is never on screen
  useLayoutEffect(() => {
    const goingBack = navigationType === 'POP'
    // a link can ask for a section by name instead of the top of the page
    const anchor = goingBack ? null : (location.state?.scrollTo ?? null)
    const saved  = goingBack ? (positions.get(location.key) ?? 0) : 0

    let frames = 0
    let raf = null
    restoring.current = true

    // the page grows as its data arrives, so keep re-applying the offset
    // until it sticks rather than scrolling once against a half-built page
    function settle() {
      const target = anchor ? offsetOf(anchor) : saved
      if (target !== null) window.scrollTo(0, target)

      const landed = target !== null && Math.abs(window.scrollY - target) <= 2
      if (!landed && frames++ < MAX_FRAMES) {
        raf = requestAnimationFrame(settle)
      } else {
        stop()
      }
    }

    // the visitor scrolling themselves always wins over a pending restore.
    // this doubles as the cleanup, so it never writes a position — by then
    // the browser has already clamped the offset to the next, shorter page
    function stop() {
      if (raf !== null) cancelAnimationFrame(raf)
      raf = null
      restoring.current = false
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
    }

    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('touchstart', stop, { passive: true })
    settle()

    return stop
  }, [location.key, navigationType])

  return null
}

// Offset that puts `id` just below the navbar, or null while that section
// has not been rendered yet.
function offsetOf(id) {
  const el = document.getElementById(id)
  if (!el) return null
  return Math.max(0, el.getBoundingClientRect().top + window.scrollY - NAVBAR_HEIGHT)
}
