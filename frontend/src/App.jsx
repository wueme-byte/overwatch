import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/home'
import Search from './pages/search'
import Themes from './pages/themes'

export default function App() {
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
