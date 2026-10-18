import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { NewsProvider } from './news.jsx'
import { RecProvider } from './rec/rec.jsx'
import { ImagesProvider } from './images.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'
import { SocialProvider } from './social/SocialProvider.jsx'
import { initRuntimeSecurity } from './security/runtimeSecurity.js'
import './index.css'

initRuntimeSecurity()
// Manejo global para chunks dinamicos obsoletos tras un nuevo despliegue
function handleChunkError() {
  try {
    const key = 'orunei_preload_error_reload'
    const last = sessionStorage.getItem(key)
    const now = Date.now()
    if (!last || now - Number(last) > 10000) {
      sessionStorage.setItem(key, String(now))
      window.location.reload()
    }
  } catch {}
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  handleChunkError()
})

window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event.reason?.message || event.reason || '')
  if (msg.includes('dynamically imported module') || msg.includes('Failed to fetch') || msg.includes('ChunkLoadError')) {
    event.preventDefault()
    handleChunkError()
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(<ErrorBoundary><AuthProvider><SocialProvider><ImagesProvider><NewsProvider><RecProvider><App /></RecProvider></NewsProvider></ImagesProvider></SocialProvider></AuthProvider></ErrorBoundary>)

