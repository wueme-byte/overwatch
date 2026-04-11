import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/home'
import Search from './pages/search'
import Themes from './pages/themes'

const scale = Math.min(window.innerWidth / 390, window.innerHeight / 844)

export default function App() {
  return (
    <div style={{
      width: 390,
      height: 844,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      overflow: 'hidden',
      background: '#080808',
    }}>
      <BrowserRouter basename="/overwatch">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/themes" element={<Themes />} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}
