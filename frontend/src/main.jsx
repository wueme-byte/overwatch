import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// П1: шрифт Manrope лежит на нашем сайте (раньше — Google Fonts). Переменный: все толщины
// 200–800 в одном файле; браузер скачивает только нужные алфавиты (латиница, кириллица…)
import '@fontsource-variable/manrope'
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
