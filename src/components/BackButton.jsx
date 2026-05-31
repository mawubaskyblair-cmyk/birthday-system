import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function BackButton({ label = 'Back', className = '' }) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(-1)}
      className={`mb-4 flex items-center gap-2 text-sm transition hover:text-emerald-600 ${className}`}
      style={{ color: 'var(--text-secondary)' }}
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  )
}
