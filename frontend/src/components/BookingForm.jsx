import { useEffect, useState } from 'react'

const today = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD

export default function BookingForm({ services, selectedId, onSelectService }) {
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [slot, setSlot] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [fields, setFields] = useState({ name: '', email: '', phone: '', car: '' })
  const [status, setStatus] = useState(null) // { type: 'success' | 'error', text }
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setSlot('')
    setSlots([])
    if (!selectedId || !date) return
    let cancelled = false
    setLoadingSlots(true)
    fetch(`/api/slots?service_id=${selectedId}&date=${date}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => !cancelled && setSlots(data))
      .catch(() => !cancelled && setSlots([]))
      .finally(() => !cancelled && setLoadingSlots(false))
    return () => {
      cancelled = true
    }
  }, [selectedId, date, refresh])

  const setField = (key) => (e) => setFields({ ...fields, [key]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: Number(selectedId),
          customer_name: fields.name,
          customer_email: fields.email,
          customer_phone: fields.phone,
          car_model: fields.car,
          slot_start: slot,
        }),
      })
      const data = await res.json()
      if (res.status === 201) {
        setStatus({
          type: 'success',
          text: `Thank you, ${data.customer_name}! Your booking #${data.id} for ${slot} is received.`,
        })
        setFields({ name: '', email: '', phone: '', car: '' })
        setSlot('')
        setRefresh((n) => n + 1)
      } else {
        setStatus({ type: 'error', text: data.error || 'Booking failed.' })
        if (res.status === 409) setRefresh((n) => n + 1)
      }
    } catch {
      setStatus({ type: 'error', text: 'Could not reach the server. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>
        Service
        <select value={selectedId} onChange={(e) => onSelectService(e.target.value)} required>
          <option value="">Choose a service…</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} – {s.price_eur} €
            </option>
          ))}
        </select>
      </label>

      <label>
        Date
        <input type="date" value={date} min={today()} onChange={(e) => setDate(e.target.value)} required />
      </label>

      {selectedId && date && (
        <div>
          <span className="label">Available times</span>
          {loadingSlots && <p className="meta">Loading…</p>}
          {!loadingSlots && slots.length === 0 && (
            <p className="meta">No free times on this day. Please pick another date.</p>
          )}
          <div className="slots">
            {slots.map((s) => (
              <button
                type="button"
                key={s}
                className={`slot ${slot === s ? 'active' : ''}`}
                onClick={() => setSlot(s)}
              >
                {s.slice(11)}
              </button>
            ))}
          </div>
        </div>
      )}

      <label>
        Your name
        <input value={fields.name} onChange={setField('name')} required minLength={2} />
      </label>
      <label>
        Email
        <input type="email" value={fields.email} onChange={setField('email')} required />
      </label>
      <label>
        Phone (optional)
        <input value={fields.phone} onChange={setField('phone')} />
      </label>
      <label>
        Car model (optional)
        <input value={fields.car} onChange={setField('car')} placeholder="e.g. BMW 320d" />
      </label>

      <button className="btn" type="submit" disabled={!slot || submitting}>
        {submitting ? 'Booking…' : 'Confirm booking'}
      </button>

      {status && <p className={status.type === 'success' ? 'success' : 'error'}>{status.text}</p>}
    </form>
  )
}
