import { useNavigate } from 'react-router-dom'

export default function Themes() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen p-4">
      <button onClick={() => navigate(-1)} className="text-gray-400 mb-4">← Back</button>
      <h1 className="text-xl font-bold mb-4">Themes</h1>
      <p className="text-gray-400">Coming soon...</p>
    </div>
  )
}
