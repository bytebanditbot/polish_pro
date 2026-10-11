import { useCallback, useEffect, useState } from 'react'
import ContentManager from './ContentManager'
import EmailSettings from './EmailSettings'
import { printCertificate, printClientSheet, printInquiries } from './inquiryExport'

function ColumnIcon({ name }) {
  return (
    <svg className="inquiry-column-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {name === 'client' && (
        <>
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
        </>
      )}
      {name === 'service' && (
        <>
          <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
          <path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" />
        </>
      )}
      {name === 'vehicle' && (
        <>
          <path d="m5 11 1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
          <path d="M3.5 11h17v7h-17zM6.5 18v2m11-2v2M6 14h.01M18 14h.01" />
        </>
      )}
      {name === 'date' && (
        <>
          <rect x="4" y="6" width="16" height="15" rx="2" />
          <path d="M8 3v6m8-6v6M4 11h16" />
        </>
      )}
      {name === 'status' && (
        <>
          <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" />
          <path d="M12 7v5l3.5 2M16 3.5h4.5V8" />
        </>
      )}
      {name === 'action' && (
        <>
          <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      )}
    </svg>
  )
}

function PrintIcon() {
  return (
    <svg className="print-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 8V3.5h10V8" />
      <rect x="3.5" y="8" width="17" height="8.5" rx="2" />
      <path d="M7 14h10v6.5H7z" />
      <path d="M17 11h.01" />
    </svg>
  )
}

function ContactIcon({ name }) {
  return (
    <svg className="inquiry-contact-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {name === 'email' ? (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </>
      ) : (
        <path d="M7 3h3l2 5-2 2a15 15 0 0 0 4 4l2-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 5 5a2 2 0 0 1 2-2Z" />
      )}
    </svg>
  )
}

function formatConversationBody(body) {
  return body.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem('adminToken') || '')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('new')
  const [page, setPage] = useState('inquiries')
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [conversation, setConversation] = useState([])
  const [conversationLoading, setConversationLoading] = useState(false)
  const [conversationError, setConversationError] = useState('')
  const [conversationRefresh, setConversationRefresh] = useState(0)
  const [deleteRequest, setDeleteRequest] = useState(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deletePasswordError, setDeletePasswordError] = useState('')
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  // Print pop-ups: null | 'sheet' | 'certificate-ask' | 'certificate-form'
  const [printDialog, setPrintDialog] = useState(null)
  const [certificate, setCertificate] = useState({ date: '', hours: '', price: '' })
  const [certificateError, setCertificateError] = useState('')

  const logout = useCallback(() => {
    sessionStorage.removeItem('adminToken')
    setToken('')
    setItems([])
  }, [])

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/api/admin/inquiries', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) return logout()
      if (!res.ok) throw new Error()
      setItems(await res.json())
    } catch {
      setError('Impossible de charger les demandes.')
    }
  }, [token, logout])

  useEffect(() => {
    if (token) load()
  }, [token, load])

  const selected = items.find((item) => item.id === selectedId)

  useEffect(() => {
    setPrintDialog(null)
    setCertificateError('')
  }, [selectedId])

  useEffect(() => {
    if (!printDialog) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setPrintDialog(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [printDialog])

  function certificateDefaults(inquiry) {
    return {
      date: new Date().toLocaleDateString('sv-SE'),
      hours: inquiry.service_duration_min
        ? String(Math.round((inquiry.service_duration_min / 60) * 100) / 100)
        : '',
      price: inquiry.service_price_eur != null ? String(inquiry.service_price_eur) : '',
    }
  }

  function validateCertificate(values) {
    const hours = Number(values.hours)
    const price = Number(values.price)
    if (!values.date || !(hours > 0) || values.price === '' || !(price >= 0)) return null
    return { date: values.date, minutes: Math.round(hours * 60), price }
  }

  async function printCertificateWith(details) {
    let business = null
    try {
      const res = await fetch('/api/content')
      if (res.ok) {
        const { contact } = await res.json()
        business = { address: contact?.address, phone: contact?.phone }
      }
    } catch {
      // The certificate still prints without the business details.
    }
    printCertificate(selected, details, business)
  }

  function startCertificate() {
    const defaults = certificateDefaults(selected)
    setCertificate(defaults)
    setCertificateError('')
    // Without a usable service duration or price there is nothing to print
    // as-is, so go straight to the form.
    setPrintDialog(validateCertificate(defaults) ? 'certificate-ask' : 'certificate-form')
  }

  function printSheet(withConversation) {
    printClientSheet(selected, withConversation ? conversation : null)
    setPrintDialog(null)
  }

  async function printCertificateAsIs() {
    const details = validateCertificate(certificate)
    if (!details) {
      setPrintDialog('certificate-form')
      return
    }
    setPrintDialog(null)
    await printCertificateWith(details)
  }

  async function handlePrintCertificate(event) {
    event.preventDefault()
    const details = validateCertificate(certificate)
    if (!details) {
      setCertificateError('Indiquez une date, un temps passé supérieur à 0 et un prix valide.')
      return
    }
    setCertificateError('')
    setPrintDialog(null)
    await printCertificateWith(details)
  }

  const shown = filter === 'archived'
    ? items.filter((item) => item.archived)
    : items.filter((item) => !item.archived && (filter === 'all' || item.status === filter))

  useEffect(() => {
    if (!selectedId) return undefined
    let cancelled = false
    setConversation([])
    setConversationError('')
    setConversationLoading(true)
    fetch(`/api/admin/inquiries/${selectedId}/conversation`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (res) => {
      if (res.status === 401) {
        logout()
        return
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Impossible de charger la conversation Gmail.')
      if (!cancelled) setConversation(data)
    }).catch((err) => {
      if (!cancelled) setConversationError(err.message || 'Impossible de joindre Gmail.')
    }).finally(() => {
      if (!cancelled) setConversationLoading(false)
    })
    return () => { cancelled = true }
  }, [selectedId, conversationRefresh, token, logout])

  async function handleLogin(e) {
    e.preventDefault()
    setLoginError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) return setLoginError(data.error || 'Échec de la connexion.')
      sessionStorage.setItem('adminToken', data.token)
      setToken(data.token)
      setPassword('')
    } catch {
      setLoginError('Impossible de joindre le serveur.')
    }
  }

  async function updateInquiry(id, changes) {
    setError('')
    try {
      const res = await fetch(`/api/admin/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(changes),
      })
      if (res.status === 401) return logout()
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Impossible de mettre à jour la demande.')
        return
      }
      setItems((current) => current.map((item) => item.id === id ? { ...item, ...data } : item))
    } catch {
      setError('Impossible de joindre le serveur.')
    }
  }

  const listTitle = `Demandes ${filter === 'new' ? 'nouvelles' : filter === 'handled' ? 'traitées' : 'archivées'}`

  function formatDateOnly(value) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '–'
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  }

  function formatDateTime(value) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '–'
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  function gmailComposeUrl(inquiry) {
    const service = inquiry.service_name || 'votre demande'
    const subject = `Re: Demande de rendez-vous – ${service} [PP-${inquiry.id}]`
    const body = [
      `Bonjour ${inquiry.customer_name},`,
      '',
      `Merci pour votre demande concernant ${service}.`,
      'Nous revenons vers vous rapidement afin d’échanger sur vos besoins et de confirmer les détails du rendez-vous.',
      '',
      'N’hésitez pas à nous préciser vos disponibilités ou toute information utile.',
      '',
      'Bien cordialement,',
      'L’équipe Polish Pro',
    ].join('\n')
    const params = new URLSearchParams({ view: 'cm', fs: '1', to: inquiry.customer_email, su: subject, body })
    return `https://mail.google.com/mail/?${params.toString()}`
  }

  async function confirmDeleteInquiry() {
    if (!deleteRequest) return
    const password = deletePassword.trim()
    if (!password) {
      setDeletePasswordError('Entrez votre mot de passe admin pour confirmer la suppression.')
      return
    }

    setDeleteSubmitting(true)
    setDeletePasswordError('')
    setError('')

    try {
      const verifyRes = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      })
      if (verifyRes.status === 401) {
        setDeletePasswordError('Mot de passe incorrect.')
        return
      }
      if (!verifyRes.ok) {
        const verifyData = await verifyRes.json().catch(() => ({}))
        setDeletePasswordError(verifyData.error || 'Vérification du mot de passe impossible.')
        return
      }

      const res = await fetch(`/api/admin/inquiries/${deleteRequest.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) return logout()
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDeletePasswordError(data.error || 'Impossible de supprimer la demande.')
        return
      }

      setItems((current) => current.filter((item) => item.id !== deleteRequest.id))
      setSelectedId(null)
      setDeleteRequest(null)
      setDeletePassword('')
    } catch {
      setDeletePasswordError('Impossible de joindre le serveur.')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  if (!token) {
    return (
      <main className="admin">
        <h1>Connexion administrateur</h1>
        <form className="form" onSubmit={handleLogin}>
          <label>
            Mot de passe
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button className="btn" type="submit">Se connecter</button>
          {loginError && <p className="error">{loginError}</p>}
        </form>
        <p><a href="#/">← Retour au site</a></p>
      </main>
    )
  }

  return (
    <main className="admin admin-dashboard">
    <div className="admin-head">
      <h1>Administration</h1>
      <div className="admin-head-actions">
        <a className="admin-site-link" href="#/">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
          Voir le site
        </a>
        <button className="btn" onClick={logout}>Se déconnecter</button>
      </div>
    </div>

      <div className="admin-workspace">
        <nav className="admin-pages" aria-label="Sections d’administration">
          <button
            className={`slot ${page === 'inquiries' ? 'active' : ''}`}
            type="button"
            aria-current={page === 'inquiries' ? 'page' : undefined}
            onClick={() => setPage('inquiries')}
          >
            Demandes
          </button>
          <button
            className={`slot ${page === 'content' ? 'active' : ''}`}
            type="button"
            aria-current={page === 'content' ? 'page' : undefined}
            onClick={() => setPage('content')}
          >
            Contenu du site
          </button>
          <button
            className={`slot ${page === 'email' ? 'active' : ''}`}
            type="button"
            aria-current={page === 'email' ? 'page' : undefined}
            onClick={() => setPage('email')}
          >
            E-mail
          </button>
        </nav>

        <div className="admin-workspace-content">
      {page === 'content' && <ContentManager token={token} logout={logout} onServicesChanged={load} />}
      {page === 'email' && <EmailSettings token={token} logout={logout} />}

      {page === 'inquiries' && (
        <>
          {error && <p className="error">{error}</p>}
          {selected ? (
            <section className="inquiry-detail">
              <div className="inquiry-topbar">
                <button className="slot" type="button" onClick={() => setSelectedId(null)}>
                  ← Retour aux demandes
                </button>
                <div className="inquiry-print-actions">
<button className="slot" type="button" onClick={() => setPrintDialog('sheet')}>
  <PrintIcon /> Imprimer la fiche client
</button>
<button className="slot" type="button" onClick={startCertificate}>
  <PrintIcon /> Imprimer l’attestation de travaux
</button>
                </div>
              </div>
              <div className="inquiry-detail-heading">
                <div className="inquiry-customer">
                  <p className="inquiry-detail-eyebrow">Demande client</p>
                  <h2>{selected.customer_name}</h2>
                  <div className="inquiry-contact">
                    <a href={`mailto:${selected.customer_email}`}>
                      <ContactIcon name="email" />
                      <span>{selected.customer_email}</span>
                    </a>
                    {selected.customer_phone && (
                      <a href={`tel:${selected.customer_phone}`}>
                        <ContactIcon name="phone" />
                        <span>{selected.customer_phone}</span>
                      </a>
                    )}
                  </div>
                </div>
                <span className={`badge ${selected.archived ? 'archived' : selected.status}`}>
                  {selected.archived ? '⚪ Archivée' : selected.status === 'handled' ? '🟢 Traitée' : '🔵 Nouvelle'}
                </span>
              </div>

              <div className="inquiry-facts">
                <div>
                  <span>
                    Service{selected.service_price_eur != null && ` - ${selected.service_price_eur} €`}
                  </span>
                  <strong>{selected.service_name || '–'}</strong>
                </div>
                <div><span>Véhicule</span><strong>{selected.car_model || '–'}</strong></div>
                <div><span>Reçue le</span><strong>{formatDateTime(selected.created_at)}</strong></div>
              </div>

              <section className="inquiry-conversation">
                <div className="inquiry-section-heading">
                  <h3>Conversation</h3>
                  <button
                    className="slot"
                    type="button"
                    onClick={() => setConversationRefresh((current) => current + 1)}
                  >
                    Actualiser
                  </button>
                </div>
                {!selected.email_sent && <p className="error">La notification à l’administrateur n’a pas été envoyée.</p>}
                {selected.customer_email_sent === false && <p className="error">L’e-mail de confirmation au client n’a pas été envoyé.</p>}
                {conversationLoading && <p className="meta">Chargement de la conversation Gmail…</p>}
                {conversationError && <p className="error">{conversationError}</p>}
                {[
                  {
                    id: 'initial',
                    direction: 'customer',
                    name: selected.customer_name,
                    label: 'Demande envoyée depuis le site',
                    date: selected.created_at,
                    body: selected.message,
                  },
                  ...(!conversationLoading && !conversationError
                    ? conversation.map((message) => ({
                        id: message.id,
                        direction: message.direction,
                        name: message.direction === 'admin' ? 'Vous' : selected.customer_name,
                        label: message.direction === 'admin' ? 'Polish Pro' : 'Réponse client',
                        date: message.date,
                        body: formatConversationBody(message.body),
                      }))
                    : []),
                ].map((item) => (
                  <article className={`conversation-message is-${item.direction}`} key={item.id}>
                    <div className="conversation-message-heading">
                      <span className="conversation-avatar" aria-hidden="true">{item.name.charAt(0).toUpperCase()}</span>
                      <div className="conversation-message-who">
                        <strong>{item.name}</strong>
                        <span>{item.label}</span>
                      </div>
                      <time>{formatDateTime(item.date)}</time>
                    </div>
                    <p>{item.body}</p>
                  </article>
                ))}
                {!conversationLoading && !conversationError && conversation.length === 0 && (
                  <p className="meta">Aucune réponse Gmail trouvée pour cette demande pour le moment.</p>
                )}
              </section>

              <div className="inquiry-detail-actions">
                <a className="btn inquiry-reply-action" href={gmailComposeUrl(selected)} target="_blank" rel="noreferrer">
                  <ContactIcon name="email" /> Répondre par e-mail
                </a>
<button
  className={`slot ${selected.status === 'handled' ? 'action-reopen' : 'action-handle'}`}
  type="button"
  onClick={() => updateInquiry(selected.id, { status: selected.status === 'handled' ? 'new' : 'handled' })}
>
  {selected.status === 'handled' ? 'Rouvrir la demande' : 'Marquer comme traitée'}
</button>
                <button
                  className="slot"
                  type="button"
                  onClick={() => updateInquiry(selected.id, { archived: !selected.archived })}
                >
                  {selected.archived ? 'Restaurer des archives' : 'Archiver'}
                </button>
                <button className="slot danger" type="button" onClick={() => {
                  setDeleteRequest(selected)
                  setDeletePassword('')
                  setDeletePasswordError('')
                }}>
                  Supprimer
                </button>
              </div>

              {printDialog && (
                <div
                  className="booking-confirmation"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setPrintDialog(null)
                  }}
                >
                  {printDialog === 'sheet' && (
                    <div
                      className="booking-confirmation-panel recipient-notice-panel deleted delete-dialog"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="print-dialog-title"
                    >
                      <span className="booking-confirmation-mark" aria-hidden="true">?</span>
                      <p className="hero-eyebrow">Fiche client</p>
                      <h2 id="print-dialog-title">Inclure la conversation e-mail ?</h2>
                      <p>
                        La fiche contient toujours les informations du client et son message. Voulez-vous
                        aussi imprimer les échanges d’e-mails ?
                      </p>
                      {conversationLoading && <p className="meta">Chargement de la conversation Gmail…</p>}
                      <div className="print-dialog-actions">
                        <button className="slot" type="button" autoFocus onClick={() => printSheet(false)}>
                          Non
                        </button>
                        <button
                          className="btn"
                          type="button"
                          disabled={conversationLoading}
                          onClick={() => printSheet(true)}
                        >
                          Oui
                        </button>
                      </div>
                    </div>
                  )}

                  {printDialog === 'certificate-ask' && (
                    <div
                      className="booking-confirmation-panel neutral"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="print-dialog-title"
                    >
                      <span className="booking-confirmation-mark" aria-hidden="true">?</span>
                      <p className="hero-eyebrow">Attestation de travaux</p>
                      <h2 id="print-dialog-title">Voulez-vous faire des modifications ?</h2>
                      <p>
                        Date de fin : {certificate.date.split('-').reverse().join('/')} · temps passé :{' '}
                        {certificate.hours} h · prix : {certificate.price} €. Ces valeurs viennent du
                        service.
                      </p>
                      <div className="print-dialog-actions">
                        <button className="slot" type="button" autoFocus onClick={printCertificateAsIs}>
                          Non, imprimer
                        </button>
                        <button className="btn" type="button" onClick={() => setPrintDialog('certificate-form')}>
                          Oui, modifier
                        </button>
                      </div>
                    </div>
                  )}

                  {printDialog === 'certificate-form' && (
                    <form
                      className="booking-confirmation-panel neutral print-dialog-form"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="print-dialog-title"
                      onSubmit={handlePrintCertificate}
                    >
                      <p className="hero-eyebrow">Attestation de travaux</p>
                      <h2 id="print-dialog-title">Attestation de travaux</h2>
                      <p>
                        Les valeurs sont préremplies à partir du service. Ajustez la date de fin, le temps
                        réellement passé et le prix avant d’imprimer.
                      </p>
                      <div className="print-dialog-fields">
                        <label className="admin-field">
                          Date de fin des travaux
                          <input
                            type="date"
                            value={certificate.date}
                            onChange={(event) => setCertificate((current) => ({ ...current, date: event.target.value }))}
                            required
                            autoFocus
                          />
                        </label>
                        <label className="admin-field">
                          Temps passé (heures)
                          <input
                            type="number"
                            min="0.25"
                            step="0.25"
                            value={certificate.hours}
                            onChange={(event) => setCertificate((current) => ({ ...current, hours: event.target.value }))}
                            required
                          />
                        </label>
                        <label className="admin-field">
                          Prix (€)
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={certificate.price}
                            onChange={(event) => setCertificate((current) => ({ ...current, price: event.target.value }))}
                            required
                          />
                        </label>
                      </div>
                      {certificateError && <p className="error">{certificateError}</p>}
                      <div className="print-dialog-actions">
                        <button className="slot" type="button" onClick={() => setPrintDialog(null)}>
                          Annuler
                        </button>
                        <button className="btn" type="submit">Imprimer l’attestation</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </section>
          ) : (
            <>
              <div className="slots">
                {['new', 'handled', 'archived'].map((f) => (
                  <button key={f} className={`slot ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                    {f === 'new' ? 'Nouvelles' : f === 'handled' ? 'Traitées' : 'Archivées'}
                  </button>
                ))}
                <span className="inquiry-export-actions">
<button
  className="slot"
  type="button"
  disabled={shown.length === 0}
  title="Choisissez « Enregistrer au format PDF » dans la fenêtre d’impression pour obtenir un PDF"
  onClick={() => printInquiries(shown, listTitle)}
>
  <PrintIcon /> Imprimer / PDF (A4)
</button>
                </span>
              </div>
              {shown.length === 0 && <p className="meta">Aucune demande.</p>}
              <div className="table-wrap">
                <table className="inquiry-table">
                  <thead>
                    <tr>
                      <th><ColumnIcon name="client" /> Client</th>
                      <th><ColumnIcon name="service" /> Service</th>
                      <th><ColumnIcon name="vehicle" /> Véhicule</th>
                      <th><ColumnIcon name="date" /> Reçue le</th>
                      <th><ColumnIcon name="status" /> Statut</th>
                      <th><ColumnIcon name="action" /> Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((inquiry) => (
                      <tr key={inquiry.id}>
                        <td>{inquiry.customer_name}</td>
                        <td>{inquiry.service_name || '–'}</td>
                        <td>{inquiry.car_model || '–'}</td>
                        <td>{formatDateOnly(inquiry.created_at)}</td>
                        <td>
                          <span className={`badge ${inquiry.archived ? 'archived' : inquiry.status}`}>
                            {inquiry.archived ? '⚪ Archivée' : inquiry.status === 'handled' ? '🟢 Traitée' : '🔵 Nouvelle'}
                          </span>
                        </td>
                        <td>
                          <button className="slot" type="button" onClick={() => setSelectedId(inquiry.id)}>
                            <ColumnIcon name="action" /> Voir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {deleteRequest && (
        <div
          className="booking-confirmation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDeleteRequest(null)
              setDeletePassword('')
              setDeletePasswordError('')
            }
          }}
        >
          <section
            className="booking-confirmation-panel neutral"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirmation-title"
          >
            <span className="booking-confirmation-mark" aria-hidden="true">!</span>
            <p className="hero-eyebrow">Suppression définitive</p>
            <h2 id="delete-confirmation-title">Confirmer la suppression</h2>
            <p>
              Êtes-vous sûr de vouloir supprimer la demande de <strong>{deleteRequest.customer_name}</strong> ?
              Cette action est irréversible.
            </p>

           <form
  className="delete-dialog-form"
  onSubmit={(event) => { event.preventDefault(); confirmDeleteInquiry() }}
>
  <label className="admin-field">
    Mot de passe administrateur
    <input
      type="password"
      value={deletePassword}
      onChange={(event) => {
        setDeletePassword(event.target.value)
        setDeletePasswordError('')
      }}
      placeholder="Saisissez votre mot de passe"
      autoComplete="current-password"
      autoFocus
    />
  </label>

  {deletePasswordError && <p className="error" role="alert">{deletePasswordError}</p>}

  <div className="delete-dialog-actions">
    <button
      type="button"
      className="slot"
      onClick={() => {
        setDeleteRequest(null)
        setDeletePassword('')
        setDeletePasswordError('')
      }}
      disabled={deleteSubmitting}
    >
      Annuler
    </button>
    <button type="submit" className="btn" disabled={deleteSubmitting}>
      {deleteSubmitting ? 'Suppression…' : 'Supprimer'}
    </button>
  </div>
</form>
          </section>
        </div>
      )}
        </div>
      </div>
    </main>
  )
}
