import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function BackButton() {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(-1)}
      className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-amber-600 transition"
    >
      <ArrowLeft size={16} />
      Back
    </button>
  )
}