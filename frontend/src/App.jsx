import { useEffect, useRef, useState } from 'react'
import Services from './components/Services'
import BookingForm from './components/BookingForm'

export default function App() {
  const [services, setServices] = useState([])
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const bookingRef = useRef(null)

  useEffect(() => {
    fetch('/api/services')
      .then((res) => {
        if (!res.ok) throw new Error('bad response')
        return res.json()
      })
      .then(setServices)
      .catch(() => setError('Could not load services. Please try again later.'))
  }, [])

  function handleBook(id) {
    setSelectedId(String(id))
    bookingRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <header className="hero">
        <h1>Polish Pro</h1>
        <p>Professional car polishing and detailing. Book your slot online.</p>
        <a className="btn" href="#services">See services</a>
      </header>

      <main>
        <section id="services">
          <h2>Our services</h2>
          {error && <p className="error">{error}</p>}
          <Services services={services} onBook={handleBook} />
        </section>

        <section id="booking" ref={bookingRef}>
          <h2>Book a slot</h2>
          <BookingForm
            services={services}
            selectedId={selectedId}
            onSelectService={setSelectedId}
          />
        </section>
      </main>

      <footer>© {new Date().getFullYear()} Polish Pro</footer>
    </>
  )
}
