import { createContext, useContext, useEffect, useState } from 'react'

const CollectionContext = createContext()

export function CollectionProvider({ children }) {
  // collection = slug string (expanded) or null (all collapsed → default theme)
  const [collection, setCollectionState] = useState(
    () => localStorage.getItem('collection') || null
  )

  // Apply the saved theme on first paint
  useEffect(() => {
    const saved = localStorage.getItem('collection')
    if (saved) document.documentElement.setAttribute('data-collection', saved)
  }, [])

  function setCollection(slug) {
    setCollectionState(slug)
    if (slug) {
      // switching to a collection — update theme + persist
      document.documentElement.setAttribute('data-collection', slug)
      localStorage.setItem('collection', slug)
    } else {
      // collapsing — return to the Storm & Rose default theme
      document.documentElement.removeAttribute('data-collection')
      localStorage.removeItem('collection')
    }
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
