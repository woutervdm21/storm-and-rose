// React Router leaves the browser's scroll position alone across navigations,
// so opening a product while scrolled deep into the storefront lands you at
// the same offset — near the footer on a short page. Reset it on every route
// change, but not when only the query string or hash changes, since those are
// used for in-page anchors.
import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    // let the browser restore the old position on back/forward
    if (navigationType === 'POP') return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, navigationType])

  return null
}
