// Pudo locker picker for checkout — search by town/suburb or "near me", then pick one
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LockerPicker({ value, onChange, label = 'Your Pudo locker' }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState(null)   // null = not searched yet
  const [loading, setLoading] = useState(false)
  const [problem, setProblem] = useState(null)

  // ask the pudo-lockers function — it holds the Courier Guy key
  async function search(body) {
    setLoading(true)
    setProblem(null)
    const { data, error } = await supabase.functions.invoke('pudo-lockers', { body })
    setLoading(false)

    if (error || !data?.lockers) {
      let message = 'Locker search is unavailable right now. Please try again.'
      try { message = (await error?.context?.json())?.error ?? message } catch { /* not JSON */ }
      setProblem(message)
      setResults(null)
      return
    }
    setResults(data.lockers)
  }

  function searchByText() {
    if (query.trim().length < 2) { setProblem('Type at least 2 letters of your town or suburb.'); return }
    search({ q: query.trim() })
  }

  // browser location → closest lockers
  function searchNearMe() {
    if (!navigator.geolocation) { setProblem('Your browser cannot share its location — search by town instead.'); return }
    setLoading(true)
    setProblem(null)
    navigator.geolocation.getCurrentPosition(
      pos => search({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()  => { setLoading(false); setProblem('Could not get your location — search by town instead.') },
      { timeout: 10000 },
    )
  }

  // a locker is chosen — show it, with a way back to the list
  if (value) {
    return (
      <div className="border border-rose-deep bg-rose-dust/15 rounded-lg px-4 py-3 text-sm">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        <p className="font-semibold text-rose-deep dark:text-rose-dust">{value.name}</p>
        <p className="text-gray-600 dark:text-gray-300">{value.address}</p>
        <button type="button" onClick={() => onChange(null)} className="text-xs text-rose-mid hover:underline mt-2">
          Choose a different locker
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* search */}
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          // Enter searches instead of submitting the whole checkout form
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchByText() } }}
          placeholder="Town or suburb, e.g. Middelburg"
          aria-label="Search for a Pudo locker by town or suburb"
          className="input-field flex-1"
        />
        <button type="button" onClick={searchByText} disabled={loading} className="btn-secondary !px-5 !py-2">
          Search
        </button>
      </div>
      <button type="button" onClick={searchNearMe} disabled={loading}
              className="self-start text-sm text-rose-mid hover:underline disabled:opacity-50">
        📍 Find lockers near me
      </button>

      {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Finding lockers…</p>}
      {problem && <p className="text-sm text-red-500">{problem}</p>}

      {/* results */}
      {results && !loading && (
        results.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No lockers found. Try a nearby town, or the name of your suburb.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
            {results.map(locker => (
              <li key={locker.id}>
                <button
                  type="button"
                  onClick={() => onChange(locker)}
                  className="w-full text-left rounded-lg border border-rose-dust/40 hover:bg-rose-dust/10 px-4 py-3 text-sm transition-colors"
                >
                  <span className="font-semibold block">{locker.name}</span>
                  <span className="text-gray-600 dark:text-gray-300 block">{locker.address}</span>
                  {locker.hours && <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">{locker.hours}</span>}
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}
