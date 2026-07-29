import React from 'react'
import { reverseGeocode } from '../api'

// Session-level cache so the same coordinate isn't re-requested by every row that shares it.
const cache = new Map<string, string>()
function keyFor(lat: number, lng: number) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`
}

// Resolves a GPS coordinate (captured on check-in/out) to a human-readable address.
export default function LocationLabel({ lat, lng, className }: { lat: number; lng: number; className?: string }) {
  const key = keyFor(lat, lng)
  const [address, setAddress] = React.useState<string | null>(cache.get(key) || null)

  React.useEffect(() => {
    const cached = cache.get(key)
    if (cached) { setAddress(cached); return }
    let cancelled = false
    reverseGeocode(lat, lng)
      .then(addr => { if (!cancelled) { cache.set(key, addr); setAddress(addr) } })
      .catch(() => { if (!cancelled) setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return (
    <a href={`https://maps.google.com/?q=${lat},${lng}`} target="_blank" rel="noreferrer" className={className}>
      {address || 'Locating…'}
    </a>
  )
}
