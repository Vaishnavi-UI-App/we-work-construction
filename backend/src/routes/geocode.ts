import { Router } from 'express'
import { authMiddleware } from '../utils/auth'

// In-memory cache so the same check-in/out spot is only looked up once per server run.
const cache = new Map<string, string>()

function keyFor(lat: number, lng: number) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`
}

// Nominatim's usage policy caps free lookups at ~1 request/second — serialize
// outbound calls through this queue so a table full of rows doesn't burst it.
let queue: Promise<unknown> = Promise.resolve()
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(() => new Promise(resolve => setTimeout(resolve, 1100))).then(fn)
  queue = run.catch(() => {})
  return run
}

export default function () {
  const router = Router()
  router.use(authMiddleware)

  // Real-world address for a GPS coordinate (device location captured on check-in/out,
  // not IP-based) — falls back to the raw coordinates if the lookup fails.
  router.get('/reverse', async (req, res) => {
    const lat = Number(req.query.lat)
    const lng = Number(req.query.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'lat and lng required' })
    }

    const key = keyFor(lat, lng)
    const cached = cache.get(key)
    if (cached) return res.json({ address: cached })

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`
      const resp = await throttled(() => fetch(url, {
        headers: { 'User-Agent': 'WeWorkConstructions-Attendance/1.0 (internal HR tool)' },
      }))
      if (!resp.ok) throw new Error(`geocode failed: ${resp.status}`)
      const data: any = await resp.json()
      const addr = data.address || {}
      const parts = [
        addr.road || addr.suburb || addr.neighbourhood,
        addr.city || addr.town || addr.village,
        addr.state,
      ].filter(Boolean)
      const address = parts.length ? parts.join(', ') : (data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      cache.set(key, address)
      res.json({ address })
    } catch (err) {
      res.json({ address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` })
    }
  })

  return router
}
