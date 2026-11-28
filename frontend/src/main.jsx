import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { trackVisit } from './api/visit'

if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready()
  window.Telegram.WebApp.expand()
  try { window.Telegram.WebApp.requestFullscreen() } catch { /* старый Telegram без fullscreen */ }
}

trackVisit('open')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
