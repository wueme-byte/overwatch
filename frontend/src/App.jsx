import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/home'
import Search from './pages/search'
import Themes from './pages/themes'
import DesktopBlock from './pages/desktop'

function isDesktop() {
  if (new URLSearchParams(window.location.search).has('dev')) return false
  const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
  return mq.matches && window.innerWidth > 768
}

export default function App() {
  if (isDesktop()) return <DesktopBlock />

  return (
    <BrowserRouter basename="/overwatch">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/themes" element={<Themes />} />
      </Routes>
    </BrowserRouter>
  )
}
