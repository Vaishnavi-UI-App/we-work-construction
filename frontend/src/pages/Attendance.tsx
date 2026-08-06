import React from 'react'
import { checkIn, checkOut, fetchMyAttendance, fetchTodayAttendance, fetchAllAttendance } from '../api'
import {
  CalendarCheck, Clock, MapPin, CheckCircle, LogIn, LogOut, AlertCircle,
  Users, XCircle, Filter, UserCog, Camera,
} from 'lucide-react'
import toast from 'react-hot-toast'
import LocationLabel from '../components/LocationLabel'
import CameraCaptureModal from '../components/CameraCaptureModal'

// Derives the uploads host from the same API base axios uses (api.ts), so photo
// URLs resolve correctly both in dev (backend on :4001) and in production (same
// origin, proxied by nginx) instead of hardcoding localhost.
const UPLOADS_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4001/api').replace(/\/api\/?$/, '')

function getLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => reject(new Error('Location permission denied'))
    )
  })
}

function fmt12(d: string) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

const ROLE_BADGE: Record<string, string> = {
  ADMIN:    'bg-rose-100 text-rose-700',
  MANAGER:  'bg-purple-100 text-purple-700',
  EMPLOYEE: 'bg-blue-100 text-blue-700',
  CUSTOMER: 'bg-emerald-100 text-emerald-700',
}

// ── My Attendance tab ────────────────────────────────────────────────────────
function MyAttendanceTab() {
  const [today, setToday]     = React.useState<any>(null)
  const [history, setHistory] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy]       = React.useState(false)
  const [locMsg, setLocMsg]   = React.useState('')
  const [showCamera, setShowCamera] = React.useState<'checkin' | 'checkout' | null>(null)

  async function load() {
    const [t, h] = await Promise.all([fetchTodayAttendance(), fetchMyAttendance()])
    setToday(t); setHistory(h); setLoading(false)
  }
  React.useEffect(() => { load() }, [])

  async function handleCheckIn(photo: Blob) {
    setBusy(true); setLocMsg('Fetching your location…')
    try {
      const loc = await getLocation()
      setLocMsg('')
      const fd = new FormData()
      fd.append('lat', String(loc.lat)); fd.append('lng', String(loc.lng))
      fd.append('photo', photo, 'checkin.jpg')
      await checkIn(fd)
      toast.success('Checked in successfully!')
      load()
    } catch (e: any) {
      setLocMsg('')
      toast.error(e?.response?.data?.error || e?.message || 'Check-in failed')
    } finally { setBusy(false) }
  }

  async function handleCheckOut(photo: Blob) {
    setBusy(true); setLocMsg('Fetching your location…')
    try {
      const loc = await getLocation()
      setLocMsg('')
      const fd = new FormData()
      fd.append('lat', String(loc.lat)); fd.append('lng', String(loc.lng))
      fd.append('photo', photo, 'checkout.jpg')
      await checkOut(fd)
      toast.success('Checked out successfully!')
      load()
    } catch (e: any) {
      setLocMsg('')
      toast.error(e?.response?.data?.error || e?.message || 'Check-out failed')
    } finally { setBusy(false) }
  }

  const checkedIn  = !!today?.checkIn
  const checkedOut = !!today?.checkOut

  return (
    <div className="space-y-6">
      {/* Today card */}
      <div className={`rounded-2xl p-6 border-2 transition-colors ${
        checkedOut ? 'bg-emerald-50 border-emerald-200' :
        checkedIn  ? 'bg-blue-50 border-blue-200' :
                     'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-4 mb-5">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
            checkedOut ? 'bg-emerald-500' : checkedIn ? 'bg-blue-500' : 'bg-slate-200'}`}>
            <CalendarCheck size={28} className="text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800">
              {checkedOut ? 'Completed' : checkedIn ? 'Currently Working' : 'Not Checked In'}
            </p>
            <p className="text-sm text-slate-500">Today's status</p>
          </div>
        </div>

        {/* Times */}
        {checkedIn && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white rounded-xl p-3 border border-blue-100 flex gap-3">
              {today.checkInPhotoUrl && (
                <img src={`${UPLOADS_BASE}${today.checkInPhotoUrl}`} alt="Check-in photo"
                  className="w-14 h-14 rounded-lg object-cover shrink-0 border border-blue-100" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <LogIn size={14} /><span className="text-xs font-semibold uppercase tracking-wide">Check In</span>
                </div>
                <p className="font-bold text-slate-800">{fmt12(today.checkIn)}</p>
                {today.checkInLat && (
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <MapPin size={10} className="shrink-0" />
                    <LocationLabel lat={today.checkInLat} lng={today.checkInLng} className="hover:underline hover:text-slate-600" />
                  </p>
                )}
              </div>
            </div>
            {checkedOut ? (
              <div className="bg-white rounded-xl p-3 border border-emerald-100 flex gap-3">
                {today.checkOutPhotoUrl && (
                  <img src={`${UPLOADS_BASE}${today.checkOutPhotoUrl}`} alt="Check-out photo"
                    className="w-14 h-14 rounded-lg object-cover shrink-0 border border-emerald-100" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-emerald-600 mb-1">
                    <LogOut size={14} /><span className="text-xs font-semibold uppercase tracking-wide">Check Out</span>
                  </div>
                  <p className="font-bold text-slate-800">{fmt12(today.checkOut)}</p>
                  <p className="text-xs text-emerald-600 mt-1 font-medium">{today.hoursWorked}h worked</p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl p-3 border border-dashed border-slate-200 flex items-center justify-center">
                <p className="text-slate-400 text-sm">Not checked out</p>
              </div>
            )}
          </div>
        )}

        {locMsg && (
          <div className="flex items-center gap-2 text-blue-600 text-sm mb-4">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            {locMsg}
          </div>
        )}

        {/* Action buttons */}
        {!checkedIn && (
          <button onClick={() => setShowCamera('checkin')} disabled={busy}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700">
            {busy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Camera size={18} />}
            Check In with Photo
          </button>
        )}
        {checkedIn && !checkedOut && (
          <button onClick={() => setShowCamera('checkout')} disabled={busy}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700">
            {busy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Camera size={18} />}
            Check Out with Photo
          </button>
        )}
        {checkedOut && (
          <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold py-2">
            <CheckCircle size={18} /> Day complete — {today.hoursWorked} hours worked
          </div>
        )}
      </div>

      {/* Location info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">
          Location is captured automatically on check-in and check-out. Please allow location access when prompted.
        </p>
      </div>

      {/* History */}
      <div className="card">
        <h2 className="font-semibold text-slate-700 mb-4">Attendance History</h2>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  {['Date', 'Check In', 'Check Out', 'Hours', 'Location', 'Photos'].map(h => <th key={h} className="table-head">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {history.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="table-cell font-medium">{fmtDate(r.date + 'T00:00:00')}</td>
                    <td className="table-cell text-blue-600">{r.checkIn ? fmt12(r.checkIn) : '—'}</td>
                    <td className="table-cell text-emerald-600">{r.checkOut ? fmt12(r.checkOut) : '—'}</td>
                    <td className="table-cell">{r.hoursWorked ? <span className="font-semibold">{r.hoursWorked}h</span> : '—'}</td>
                    <td className="table-cell text-xs text-slate-400 max-w-xs">
                      {r.checkInLat
                        ? <span className="flex items-center gap-1">
                            <MapPin size={11} className="shrink-0" />
                            <LocationLabel lat={r.checkInLat} lng={r.checkInLng} className="hover:underline hover:text-slate-600 truncate" />
                          </span>
                        : '—'}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5">
                        {r.checkInPhotoUrl && (
                          <a href={`${UPLOADS_BASE}${r.checkInPhotoUrl}`} target="_blank" rel="noreferrer">
                            <img src={`${UPLOADS_BASE}${r.checkInPhotoUrl}`} alt="Check-in" className="w-9 h-9 rounded-lg object-cover border border-blue-100" />
                          </a>
                        )}
                        {r.checkOutPhotoUrl && (
                          <a href={`${UPLOADS_BASE}${r.checkOutPhotoUrl}`} target="_blank" rel="noreferrer">
                            <img src={`${UPLOADS_BASE}${r.checkOutPhotoUrl}`} alt="Check-out" className="w-9 h-9 rounded-lg object-cover border border-emerald-100" />
                          </a>
                        )}
                        {!r.checkInPhotoUrl && !r.checkOutPhotoUrl && '—'}
                      </div>
                    </td>
                  </tr>
                ))}
                {!history.length && <tr><td colSpan={6} className="table-cell text-center text-slate-400 py-10">No attendance records yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCamera && (
        <CameraCaptureModal
          title={showCamera === 'checkin' ? 'Check-In Photo' : 'Check-Out Photo'}
          onClose={() => setShowCamera(null)}
          onConfirm={async (blob) => {
            const type = showCamera
            setShowCamera(null)
            if (type === 'checkin') await handleCheckIn(blob)
            else await handleCheckOut(blob)
          }}
        />
      )}
    </div>
  )
}

// ── All Attendance tab ───────────────────────────────────────────────────────
function AllAttendanceTab() {
  const todayStr = new Date().toISOString().slice(0, 10)
  const [date, setDate]       = React.useState(todayStr)
  const [records, setRecords] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  function load(d: string) {
    setLoading(true)
    fetchAllAttendance(d)
      .then(r => { setRecords(r); setLoading(false) })
      .catch(() => setLoading(false))
  }
  React.useEffect(() => { load(date) }, [date])

  const present  = records.filter(r => r.checkIn).length
  const complete = records.filter(r => r.checkIn && r.checkOut).length
  const absent   = records.filter(r => !r.checkIn).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
          <Filter size={15} className="text-slate-400" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="text-sm text-slate-700 focus:outline-none" />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
            <Users size={18} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{present}</p>
          <p className="text-xs text-slate-500 mt-0.5">Present</p>
        </div>
        <div className="card text-center">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-2">
            <CheckCircle size={18} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{complete}</p>
          <p className="text-xs text-slate-500 mt-0.5">Completed</p>
        </div>
        <div className="card text-center">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center mx-auto mb-2">
            <XCircle size={18} className="text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{absent}</p>
          <p className="text-xs text-slate-500 mt-0.5">Absent</p>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Employee', 'Role', 'Check In', 'Check Out', 'Hours', 'Check-in Location', 'Check-out Location', 'Photos'].map(h => (
                    <th key={h} className="table-head">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r: any) => (
                  <tr key={r.id} className={`hover:bg-slate-50/50 transition-colors ${!r.checkIn ? 'opacity-50' : ''}`}>
                    <td className="table-cell">
                      <div>
                        <p className="font-semibold text-slate-800">{r.user?.name || '—'}</p>
                        <p className="text-xs text-slate-400">{r.user?.email}</p>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[r.user?.role] || 'bg-slate-100 text-slate-600'}`}>
                        {r.user?.role}
                      </span>
                    </td>
                    <td className="table-cell">
                      {r.checkIn
                        ? <span className="text-blue-600 font-medium flex items-center gap-1"><Clock size={12} />{fmt12(r.checkIn)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="table-cell">
                      {r.checkOut
                        ? <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle size={12} />{fmt12(r.checkOut)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="table-cell">
                      {r.hoursWorked ? <span className="font-bold text-slate-700">{r.hoursWorked}h</span> : '—'}
                    </td>
                    <td className="table-cell text-xs max-w-xs">
                      {r.checkInLat
                        ? <span className="flex items-center gap-1 text-blue-500 hover:text-blue-700">
                            <MapPin size={11} className="shrink-0" />
                            <LocationLabel lat={r.checkInLat} lng={r.checkInLng} className="hover:underline truncate" />
                          </span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="table-cell text-xs max-w-xs">
                      {r.checkOutLat
                        ? <span className="flex items-center gap-1 text-emerald-500 hover:text-emerald-700">
                            <MapPin size={11} className="shrink-0" />
                            <LocationLabel lat={r.checkOutLat} lng={r.checkOutLng} className="hover:underline truncate" />
                          </span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5">
                        {r.checkInPhotoUrl && (
                          <a href={`${UPLOADS_BASE}${r.checkInPhotoUrl}`} target="_blank" rel="noreferrer">
                            <img src={`${UPLOADS_BASE}${r.checkInPhotoUrl}`} alt="Check-in" className="w-9 h-9 rounded-lg object-cover border border-blue-100" />
                          </a>
                        )}
                        {r.checkOutPhotoUrl && (
                          <a href={`${UPLOADS_BASE}${r.checkOutPhotoUrl}`} target="_blank" rel="noreferrer">
                            <img src={`${UPLOADS_BASE}${r.checkOutPhotoUrl}`} alt="Check-out" className="w-9 h-9 rounded-lg object-cover border border-emerald-100" />
                          </a>
                        )}
                        {!r.checkInPhotoUrl && !r.checkOutPhotoUrl && <span className="text-slate-300">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
                {!records.length && (
                  <tr><td colSpan={8} className="table-cell text-center text-slate-400 py-14">
                    No attendance records for {date}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Attendance({ user }: { user?: any }) {
  const canViewAll = !!user?.isAdmin || !!user?.permissions?.['admin-attendance']?.canView
  const [tab, setTab] = React.useState<'mine' | 'all'>('mine')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {canViewAll && (
        <div className="flex gap-2 border-b border-slate-200">
          <button onClick={() => setTab('mine')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'mine' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            <CalendarCheck size={15} /> My Attendance
          </button>
          <button onClick={() => setTab('all')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            <UserCog size={15} /> Attendance of All Users
          </button>
        </div>
      )}

      {!canViewAll || tab === 'mine' ? <MyAttendanceTab /> : <AllAttendanceTab />}
    </div>
  )
}
