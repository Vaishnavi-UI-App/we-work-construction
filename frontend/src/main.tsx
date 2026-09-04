import React from 'react'
import { createRoot } from 'react-dom/client'
import toast from 'react-hot-toast'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // A PWA icon on a home screen often resumes an already-running instance
      // instead of doing a fresh page load, so it can keep running the JS
      // bundle from before the last deploy indefinitely. Once the browser
      // finishes installing a newer service worker in the background, prompt
      // for a refresh instead of forcing one — an unannounced reload could
      // wipe out an invoice or expense form someone's in the middle of filling.
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            toast((t) => (
              <span className="flex items-center gap-3">
                A new version is available.
                <button
                  onClick={() => { toast.dismiss(t.id); window.location.reload() }}
                  className="font-semibold text-blue-600 underline"
                >
                  Refresh now
                </button>
              </span>
            ), { duration: Infinity })
          }
        })
      })
    }).catch(() => {})
  })
}
