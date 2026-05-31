import { useEffect, useState } from 'react'
import { Cake } from 'lucide-react'

const LOGO_SRC = '/birthday-photo.jpg'
const LOGO_SIZE = 56

export default function LoginLogo() {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const img = new Image()
    img.decoding = 'async'
    img.loading = 'eager'

    const onLoad = () => setStatus('loaded')
    const onError = () => setStatus('error')

    img.addEventListener('load', onLoad)
    img.addEventListener('error', onError)
    img.src = LOGO_SRC

    return () => {
      img.removeEventListener('load', onLoad)
      img.removeEventListener('error', onError)
    }
  }, [])

  return (
    <div
      className="login-logo-wrap"
      style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
      aria-hidden={status === 'error'}
    >
      {status === 'loading' && (
        <div className="login-logo-skeleton" aria-label="Loading logo" />
      )}

      {status === 'error' && (
        <div className="login-logo-fallback" aria-label="BirthdayTracker">
          <Cake size={28} strokeWidth={2} />
        </div>
      )}

      {status === 'loaded' && (
        <img
          src={LOGO_SRC}
          alt="BirthdayTracker logo"
          width={LOGO_SIZE}
          height={LOGO_SIZE}
          decoding="async"
          loading="eager"
          fetchPriority="high"
          className="login-logo-img"
        />
      )}
    </div>
  )
}
