import { useEffect, useState } from 'react'

export default function App() {
  const [services, setServices] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/services')
      .then((res) => res.json())
      .then(setServices)
      .catch(() => setError('Could not load services'))
  }, [])

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Polish Pro</h1>
      <p>Professional car polishing and detailing.</p>
      {error && <p>{error}</p>}
      <ul>
        {services.map((s) => (
          <li key={s.id}>
            <strong>{s.name}</strong> – {s.price_eur} € ({s.duration_min} min)
            <br />
            {s.description}
          </li>
        ))}
      </ul>
    </main>
  )
}
