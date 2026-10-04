import { useEffect, useRef, useState } from 'react'
import Services from './components/Services'
import BookingForm from './components/BookingForm'
import SiteFooter, { SocialIcon } from './components/Socials'
import { getSocialLinks } from './components/social-links'

const defaultReviews = [
  {
    name: 'Exemple fictif · Client 01',
    rating: 5,
    quote: 'Le résultat est superbe : la carrosserie a retrouvé une belle brillance. Travail minutieux et accueil au top.',
  },
  {
    name: 'Exemple fictif · Client 02',
    rating: 5,
    quote: 'Très satisfait du soin apporté à ma voiture. Chaque détail a été pris en compte, je recommande l’expérience.',
  },
  {
    name: 'Exemple fictif · Client 03',
    rating: 5,
    quote: 'Un service sérieux et un résultat qui fait plaisir à voir. Ma voiture est ressortie impeccable.',
  },
]

export default function App() {
  const [services, setServices] = useState([])
  const [error, setError] = useState(null)
  const [siteContent, setSiteContent] = useState(null)
  const [contentError, setContentError] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const bookingRef = useRef(null)
  const imageCloseRef = useRef(null)
  const imageOpenerRef = useRef(null)

  const beforeAfter = [
    {
      label: 'Avant',
      description: 'Oxydation, rayures et manque de brillance.',
      image:
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80',
      alt: 'Voiture avant detailing',
    },
    {
      label: 'Après',
      description: 'Reflet profond, finition brillante et parfaite.',
      image:
        'https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=900&q=80',
      alt: 'Voiture après detailing',
    },
  ]

  useEffect(() => {
    fetch('/api/services')
      .then((res) => {
        if (!res.ok) throw new Error('bad response')
        return res.json()
      })
      .then(setServices)
      .catch(() => setError('Could not load services. Please try again later.'))
  }, [])

  useEffect(() => {
    fetch('/api/content')
      .then((res) => {
        if (!res.ok) throw new Error('Could not load site content')
        return res.json()
      })
      .then(setSiteContent)
      .catch(() => setContentError('Impossible de charger les contenus du site. Réessayez plus tard.'))
  }, [])

  useEffect(() => {
    if (window.location.hash === '#services') {
      document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    if (!selectedImage) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    imageCloseRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedImage(null)
      if (event.key === 'Tab') {
        event.preventDefault()
        imageCloseRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      imageOpenerRef.current?.focus()
    }
  }, [selectedImage])

  function handleBook(id) {
    setSelectedId(String(id))
    bookingRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const headerSocials = getSocialLinks(siteContent?.socials).slice(0, 3)
  const contact = siteContent?.contact
  const homeBeforeAfter = siteContent?.homeBeforeAfter || beforeAfter
  const reviews = siteContent?.reviews || defaultReviews

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <a className="brand" href="#" aria-label="Polish Pro - retour en haut">
            Polish Pro
          </a>

          <button
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Fermer le menu' : 'Afficher le menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>

          <div className={`header-panel ${menuOpen ? 'open' : ''}`}>
            <nav className="top-nav" aria-label="Navigation principale">
              <a href="#services" onClick={() => setMenuOpen(false)}>Services</a>
              <a href="#booking" onClick={() => setMenuOpen(false)}>Rendez-vous</a>
              <a href="#/gallery" onClick={() => setMenuOpen(false)}>Galerie</a>
              <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
            </nav>

            <div className="social-links" aria-label="Réseaux sociaux">
              {headerSocials.map(({ label, href, type }) => (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}>
                  <SocialIcon type={type} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </header>

      <header className="hero">
        <p className="hero-eyebrow">Detailing automobile professionnel</p>
        <h1>Polish Pro</h1>
        <p>Finitions et detailing automobile professionnels. Prenez rendez-vous en ligne.</p>
        <a className="btn" href="#services">Voir les services</a>
      </header>

      <main>
        {contentError && <p className="error" role="alert">{contentError}</p>}
        <section className="comparison-section">
          <div className="section-heading">
            <h2>Avant & Après</h2>
            <p>Une finition qui redonne vie à votre voiture.</p>
          </div>

          <div className="comparison-grid">
            {homeBeforeAfter.map((item) => (
              <div className="comparison-card" key={item.label}>
                <span className="comparison-tag">{item.label}</span>
                <button
                  className="comparison-image-trigger"
                  type="button"
                  aria-label={`Afficher en grand : ${item.alt}`}
                  onClick={(event) => {
                    imageOpenerRef.current = event.currentTarget
                    setSelectedImage(item)
                  }}
                >
                  <img className="comparison-image" src={item.image} alt={item.alt} />
                </button>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
          <p className="gallery-disclaimer">
            Exemples de démonstration — remplacez-les par vos propres réalisations.
          </p>
          <p className="comparison-gallery-cta">
            Vous souhaitez voir d’autres exemples avant/après ?{' '}
            <a href="#/gallery?section=gallery-before-after">Découvrez-les dans la galerie</a>.
          </p>
        </section>

        <section id="services">
          <h2>Nos services</h2>
          {error && <p className="error">{error}</p>}
          <Services services={services} onBook={handleBook} />
        </section>

        <section id="booking" ref={bookingRef}>
          <div className="booking-heading">
            <div>
              <h2>Prendre un rendez-vous</h2>
            </div>
          </div>

          <div className="booking-layout">
            <BookingForm
              services={services}
              selectedId={selectedId}
              onSelectService={setSelectedId}
            />

            <div className="booking-location">
              <div className="booking-map-wrap">
                <iframe
                  className="booking-map"
                  title="Carte 74100 Annemasse"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(contact?.address || '74100 Annemasse')}&z=12&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              <aside className="contact-card" id="contact" aria-label="Exemple de coordonnées">
                <div className="contact-card-heading">
                  <h3>Contact</h3>
                  <span>{contact?.note || 'Exemple fictif'}</span>
                </div>
                <p><strong>Nom</strong><span>{contact?.name || 'Alex Martin'}</span></p>
                <p><strong>Téléphone</strong><span><a href={`tel:${contact?.phone || '06 00 00 00 00'}`}>{contact?.phone || '06 00 00 00 00'}</a></span></p>
                <p><strong>Adresse</strong><span>{contact?.address || '12 rue des Ateliers, 74100 Annemasse'}</span></p>
              </aside>
            </div>
          </div>
        </section>

        <section className="reviews-section" aria-labelledby="reviews-title">
          <div className="section-heading">
            <h2 id="reviews-title">Ils parlent de leur expérience</h2>
            <p className="reviews-disclaimer">
              Exemples d’avis fictifs pour la maquette — à remplacer par de vrais retours clients.
            </p>
          </div>
          <div className="reviews-grid">
            {reviews.map((review, index) => (
              <article className="review-card" key={`${review.name}-${index}`}>
                <div className="review-stars" aria-label={`${review.rating} étoiles sur 5`}>
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                </div>
                <blockquote>« {review.quote} »</blockquote>
                <p className="review-author">{review.name}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      {selectedImage && (
        <div
          className="gallery-lightbox"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedImage(null)
          }}
        >
          <section
            className="gallery-lightbox-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-image-title"
          >
            <button
              ref={imageCloseRef}
              className="gallery-lightbox-close"
              type="button"
              aria-label="Fermer l'image"
              onClick={() => setSelectedImage(null)}
            >
              <span aria-hidden="true">&times;</span>
            </button>
            <img className="gallery-lightbox-image" src={selectedImage.image} alt={selectedImage.alt} />
            <div className="gallery-lightbox-copy">
              <span>{selectedImage.label}</span>
              <h2 id="home-image-title">{selectedImage.alt}</h2>
              <p>{selectedImage.description}</p>
            </div>
          </section>
        </div>
      )}

      <SiteFooter socials={siteContent?.socials} description={contact?.description} />
    </>
  )
}
