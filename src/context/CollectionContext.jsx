import { createContext, useContext, useEffect, useState } from 'react'

const CollectionContext = createContext()

export function CollectionProvider({ children }) {
  // collection = slug string (expanded) or null (all collapsed)
  const [collection, setCollectionState] = useState(
    () => localStorage.getItem('collection') ?? 'ember'
  )

  // Apply the saved theme on first paint
  useEffect(() => {
    const saved = localStorage.getItem('collection') ?? 'ember'
    document.documentElement.setAttribute('data-collection', saved)
  }, [])

  function setCollection(slug) {
    setCollectionState(slug)
    if (slug) {
      // switching to a collection — update theme + persist
      document.documentElement.setAttribute('data-collection', slug)
      localStorage.setItem('collection', slug)
    }
    // collapsing (null) keeps the last theme on <html> so colours don't reset
  }

  return (
    <CollectionContext.Provider value={{ collection, setCollection }}>
      {children}
    </CollectionContext.Provider>
  )
}

export function useCollection() {
  return useContext(CollectionContext)
}
