import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Home from './pages/home'
import Search from './pages/search'
import Themes from './pages/themes'
import DesktopBlock from './pages/desktop'

function isDesktop() {
  if (new URLSearchParams(window.location.search).has('dev')) return false
  const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
  return mq.matches && window.innerWidth > 768
}

// П3: неизвестный адрес (опечатка, старая ссылка) — на главную, а не пустой экран
function ToHome() {
  const { search, hash } = useLocation()
  return <Navigate to={{ pathname: '/', search, hash }} replace />
}

export default function App() {
  if (isDesktop()) return <DesktopBlock />

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/themes" element={<Themes />} />
        <Route path="*" element={<ToHome />} />
      </Routes>
    </BrowserRouter>
  )
}
