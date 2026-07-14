import { createContext, useContext, useEffect, useState } from 'react'

const CollectionContext = createContext()

// Default to Ember so the site always has a collection active
export function CollectionProvider({ children }) {
  const [collection, setCollectionState] = useState(
    () => localStorage.getItem('collection') ?? 'ember'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-collection', collection)
    localStorage.setItem('collection', collection)
  }, [collection])

  // Set on mount so the attribute is on <html> before first paint
  useEffect(() => {
    document.documentElement.setAttribute('data-collection', collection)
  }, [])

  return (
    <CollectionContext.Provider value={{ collection, setCollection: setCollectionState }}>
      {children}
    </CollectionContext.Provider>
  )
}

export function useCollection() {
  return useContext(CollectionContext)
}
