import React from 'react'
import { KeyRound, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import AnimatedBackground from '../components/AnimatedBackground'

export default function ResetPassword({ token, onDone }: { token: string; onDone: () => void }) {
  const [password, setPassword]   = React.useState('')
  const [confirm,  setConfirm]    = React.useState('')
  const [loading,  setLoading]    = React.useState(false)
  const [done,     setDone]       = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      setDone(true)
      toast.success('Password reset! You can now log in.')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to reset password — the link may have expired')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-28 h-16 rounded-2xl mb-4 shadow-2xl shadow-blue-500/40 overflow-hidden bg-white p-2">
            <img src="/logo.png" alt="We Work Constructions" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Reset Password</h1>
        </div>

        <div className="rounded-3xl p-8"
          style={{
            background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}>
          {done ? (
            <div className="text-center py-4">
              <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-white font-semibold mb-1">Password updated</p>
              <p className="text-slate-400 text-sm mb-6">You can now sign in with your new password.</p>
              <button onClick={onDone} className="w-full py-3 rounded-xl font-bold text-sm text-white"
                style={{ background: 'linear-gradient(135deg, #2563eb, #0ea5e9)' }}>
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-slate-400 text-sm mb-2">Choose a new password for your account.</p>
              <div>
                <label className="block text-xs font-semibold text-sky-300/80 uppercase tracking-wider mb-2">New Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 transition"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-sky-300/80 uppercase tracking-wider mb-2">Confirm Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 transition"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 mt-2"
                style={{ background: loading ? 'rgba(37,99,235,0.5)' : 'linear-gradient(135deg, #2563eb, #0ea5e9)' }}>
                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <KeyRound size={16} />}
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
              <button type="button" onClick={onDone} className="w-full text-center text-slate-400 hover:text-slate-300 text-sm pt-1">
                Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
