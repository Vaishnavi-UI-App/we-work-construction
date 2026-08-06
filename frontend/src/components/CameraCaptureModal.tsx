import React from 'react'
import { X, Camera, RefreshCw, Check } from 'lucide-react'

// Opens the device camera live (not a gallery file picker) and lets the user
// snap a photo before confirming it — used to attest presence at check-in/out.
export default function CameraCaptureModal({ title, onClose, onConfirm }: {
  title: string
  onClose: () => void
  onConfirm: (blob: Blob) => void
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const [captured, setCaptured] = React.useState<string | null>(null)
  const [capturedBlob, setCapturedBlob] = React.useState<Blob | null>(null)
  const [error, setError] = React.useState('')
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => setReady(true)
        }
      })
      .catch(() => setError('Could not access camera. Please allow camera access and try again.'))

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  function capture() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1) // mirror, matches the preview so the photo looks natural to the person taking it
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => {
      if (!blob) return
      setCapturedBlob(blob)
      setCaptured(URL.createObjectURL(blob))
      stopStream()
    }, 'image/jpeg', 0.85)
  }

  function retake() {
    if (captured) URL.revokeObjectURL(captured)
    setCaptured(null)
    setCapturedBlob(null)
    setReady(false)
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => setReady(true)
        }
      })
      .catch(() => setError('Could not access camera. Please allow camera access and try again.'))
  }

  function confirm() {
    if (!capturedBlob) return
    stopStream()
    onConfirm(capturedBlob)
  }

  function handleClose() {
    stopStream()
    if (captured) URL.revokeObjectURL(captured)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">{title}</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="relative bg-slate-900 aspect-square flex items-center justify-center">
          {error ? (
            <p className="text-white/80 text-sm text-center px-6">{error}</p>
          ) : captured ? (
            <img src={captured} alt="Captured" className="w-full h-full object-cover" />
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted
                className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
              {!ready && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-5 flex gap-3">
          {error ? (
            <button onClick={handleClose} className="btn-secondary flex-1">Close</button>
          ) : captured ? (
            <>
              <button onClick={retake} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                <RefreshCw size={16} /> Retake
              </button>
              <button onClick={confirm} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Check size={16} /> Use Photo
              </button>
            </>
          ) : (
            <button onClick={capture} disabled={!ready} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
              <Camera size={16} /> Capture
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
