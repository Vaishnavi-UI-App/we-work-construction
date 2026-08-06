import React from 'react'
import { X, Trash2 } from 'lucide-react'

// Confirms a destructive delete and collects a mandatory reason before it
// proceeds — used for invoices and delivery challans, where a deletion
// needs a paper trail (see backend DeletionLog).
export default function DeleteReasonModal({ title, itemLabel, onClose, onConfirm }: {
  title: string
  itemLabel: string
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}) {
  const [reason, setReason] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  async function confirm() {
    const trimmed = reason.trim()
    if (!trimmed) return
    setSubmitting(true)
    try { await onConfirm(trimmed) }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-base">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            You're about to permanently delete <span className="font-semibold">{itemLabel}</span>. This can't be undone.
          </p>
          <div>
            <label className="label">Reason for deletion *</label>
            <textarea className="input resize-none" rows={3} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Why is this being deleted?" autoFocus />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={confirm} disabled={submitting || !reason.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-2.5 transition-colors">
              {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 size={16} />}
              {submitting ? 'Deleting...' : 'Delete'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}
