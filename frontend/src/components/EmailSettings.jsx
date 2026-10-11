import { useEffect, useRef, useState } from 'react'

export default function EmailSettings({ token, logout }) {
  const [senderEmail, setSenderEmail] = useState('')
  const [senderConfigured, setSenderConfigured] = useState(false)
  const [appPassword, setAppPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingSender, setSavingSender] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(null)
  const closeNoticeRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/email-sender', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (res) => {
      if (res.status === 401) {
        logout()
        return
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Impossible de charger le compte Gmail.')
      if (!cancelled) {
        setSenderEmail(data.email)
        setSenderConfigured(data.configured)
        if (data.configured) {
          setNotice({
            type: 'info',
            title: 'Compte e-mail utilisé',
            message: `Les notifications et réponses sont envoyées à : ${data.email}`,
          })
        }
      }
    }).catch((err) => {
      if (!cancelled) setError(err.message || 'Impossible de joindre le serveur.')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [token, logout])

  useEffect(() => {
    if (!notice) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setNotice(null)
      if (event.key === 'Tab') {
        event.preventDefault()
        closeNoticeRef.current?.focus()
      }
    }
    closeNoticeRef.current?.focus()
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [notice])

  async function saveSender(event) {
    event.preventDefault()
    setError('')
    setSavingSender(true)
    try {
      const res = await fetch('/api/admin/email-sender', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: senderEmail, app_password: appPassword }),
      })
      if (res.status === 401) return logout()
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Impossible d’enregistrer le compte Gmail.')
        return
      }
      setSenderEmail(data.email)
      setSenderConfigured(data.configured)
      setAppPassword('')
      setNotice({
        type: 'success',
        title: 'Compte Gmail enregistré',
        message: 'Ce compte recevra les nouvelles demandes et enverra les confirmations aux clients ainsi que vos réponses.',
      })
    } catch {
      setError('Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.')
    } finally {
      setSavingSender(false)
    }
  }

  return (
    <section className="admin-email-settings">
      <h2>Compte e-mail administrateur</h2>
      <p className="meta">
        Utilisez un seul compte Gmail : il recevra les nouvelles demandes et servira à envoyer les
        confirmations et vos réponses aux clients. Le mot de passe d’application est chiffré et
        n’est jamais réaffiché.
      </p>

      {loading ? <p className="meta">Chargement…</p> : <form className="form admin-email-sender-form" onSubmit={saveSender}>
        <label>
          Adresse Gmail
          <input
            type="email"
            value={senderEmail}
            onChange={(event) => setSenderEmail(event.target.value)}
            required
            maxLength={254}
            autoComplete="username"
            placeholder="votre-adresse@gmail.com"
          />
        </label>
        <label>
          Mot de passe d’application Google
          <input
            type="password"
            value={appPassword}
            onChange={(event) => setAppPassword(event.target.value)}
            required={!senderConfigured || senderEmail.length === 0}
            minLength={16}
            maxLength={23}
            autoComplete="new-password"
            placeholder={senderConfigured ? 'Déjà enregistré — vide pour le conserver' : '16 caractères'}
          />
        </label>
        <p className="meta">
          Créez un mot de passe d’application dans les paramètres de sécurité de votre compte Google.
          Il faut activer la validation en deux étapes.{' '}
          <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">
            Ouvrir les mots de passe d’application Google
          </a>
        </p>
        <button className="btn" type="submit" disabled={savingSender}>
          {savingSender ? 'Enregistrement…' : 'Enregistrer le compte Gmail'}
        </button>
      </form>}

      {error && <p className="error">{error}</p>}
      {notice && (
        <div
          className="booking-confirmation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setNotice(null)
          }}
        >
          <section
            className={`booking-confirmation-panel recipient-notice-panel ${notice.type}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="recipient-notice-title"
            aria-describedby="recipient-notice-message"
          >
            <span className="booking-confirmation-mark" aria-hidden="true">
              {notice.type === 'success' ? '✓' : notice.type === 'info' ? 'i' : '−'}
            </span>
            <p className="hero-eyebrow">
              {notice.type === 'success' ? 'Modification enregistrée' : notice.type === 'info' ? 'Information' : 'Modification effectuée'}
            </p>
            <h2 id="recipient-notice-title">{notice.title}</h2>
            <p id="recipient-notice-message">{notice.message}</p>
            <button
              ref={closeNoticeRef}
              className="btn"
              type="button"
              onClick={() => setNotice(null)}
            >
              Compris
            </button>
          </section>
        </div>
      )}
    </section>
  )
}
