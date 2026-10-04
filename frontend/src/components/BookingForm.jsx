import { useEffect, useRef, useState } from 'react'

export default function BookingForm({ services, selectedId, onSelectService }) {
  const [fields, setFields] = useState({ name: '', email: '', phone: '', car: '' })
  const [status, setStatus] = useState(null) // { type: 'success' | 'error', text }
  const [submitting, setSubmitting] = useState(false)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false)
  const closeConfirmationRef = useRef(null)

  useEffect(() => {
    if (!confirmationOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setConfirmationOpen(false)
      if (event.key === 'Tab') {
        event.preventDefault()
        closeConfirmationRef.current?.focus()
      }
    }

    closeConfirmationRef.current?.focus()
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [confirmationOpen])

  const setField = (key) => (e) => setFields({ ...fields, [key]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus(null)
    setSubmitting(true)
    try {
      const selectedService = services.find((service) => String(service.id) === String(selectedId))
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: selectedId ? Number(selectedId) : null,
          customer_name: fields.name,
          customer_email: fields.email,
          customer_phone: fields.phone,
          car_model: fields.car,
          message: `Demande de rendez-vous${selectedService ? ` pour le service « ${selectedService.name} »` : ''}.`,
        }),
      })
      const data = await res.json()
      if (res.status === 201) {
        setConfirmationEmailSent(data.customer_email_sent === true)
        setConfirmationOpen(true)
        setFields({ name: '', email: '', phone: '', car: '' })
      } else {
        setStatus({ type: 'error', text: data.error || 'Impossible d’envoyer votre demande. Réessayez.' })
      }
    } catch {
      setStatus({ type: 'error', text: 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Service
          <select value={selectedId} onChange={(e) => onSelectService(e.target.value)} required>
            <option value="">Choisir un service…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} – {s.price_eur} €
              </option>
            ))}
          </select>
        </label>

        <label>
          Votre nom
          <input value={fields.name} onChange={setField('name')} required minLength={2} />
        </label>
        <label>
          E-mail
          <input type="email" value={fields.email} onChange={setField('email')} required />
        </label>
        <label>
          Téléphone (facultatif)
          <input value={fields.phone} onChange={setField('phone')} />
        </label>
        <label>
          Modèle de voiture (facultatif)
          <input value={fields.car} onChange={setField('car')} placeholder="ex. VW Golf VII" />
        </label>

        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Envoi en cours…' : 'Envoyer ma demande de rendez-vous'}
        </button>

        {status && <p className="error">{status.text}</p>}
      </form>

      {confirmationOpen && (
        <div
          className="booking-confirmation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmationOpen(false)
          }}
        >
          <section
            className="booking-confirmation-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-confirmation-title"
            aria-describedby="booking-confirmation-message"
          >
            <span className="booking-confirmation-mark" aria-hidden="true">✓</span>
            <p className="hero-eyebrow">Demande envoyée</p>
            <h2 id="booking-confirmation-title">Demande enregistrée</h2>
            <p id="booking-confirmation-message">
              {confirmationEmailSent
                ? 'Votre demande a bien été envoyée et un e-mail de confirmation vous a été adressé. Notre équipe vous contactera prochainement pour échanger avec vous et confirmer les détails de votre rendez-vous.'
                : 'Votre demande a bien été enregistrée, mais l’e-mail de confirmation n’a pas pu être envoyé. Notre équipe vous contactera prochainement pour échanger avec vous et confirmer les détails de votre rendez-vous.'}
            </p>
            <button
              ref={closeConfirmationRef}
              className="btn"
              type="button"
              onClick={() => setConfirmationOpen(false)}
            >
              Compris
            </button>
          </section>
        </div>
      )}
    </>
  )
}
