import { useEffect, useRef, useState } from 'react'
import SiteFooter, { SocialIcon } from './components/Socials'
import { getSocialLinks } from './components/social-links'

const projects = [
  {
    title: 'Correction de peinture',
    category: 'Polissage',
    description: 'Restauration de la brillance et correction des micro-rayures.',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=85',
    alt: 'Voiture sportive après polissage',
  },
  {
    title: 'Finition brillante',
    category: 'Protection',
    description: 'Une finition profonde avec une protection durable.',
    image: 'https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1000&q=85',
    alt: 'Carrosserie brillante après detailing',
  },
  {
    title: 'Soin extérieur',
    category: 'Detailing',
    description: 'Nettoyage minutieux et finitions soignées.',
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1000&q=85',
    alt: 'Détail extérieur d’une voiture',
  },
  {
    title: 'Rénovation de carrosserie',
    category: 'Polissage',
    description: 'Un résultat net, uniforme et éclatant.',
    image: 'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=1000&q=85',
    alt: 'Voiture rénovée et polie',
  },
  {
    title: 'Protection céramique',
    category: 'Protection',
    description: 'Une surface lisse et un éclat qui dure.',
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1000&q=85',
    alt: 'Voiture avec finition protectrice brillante',
  },
  {
    title: 'Detailing automobile',
    category: 'Detailing',
    description: 'Des détails travaillés pour une présentation impeccable.',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1000&q=85',
    alt: 'Voiture préparée avec soin',
  },
]

const beforeAfterExamples = [
  {
    title: 'Correction de peinture',
    before: projects[0],
    after: projects[1],
  },
  {
    title: 'Rénovation de carrosserie',
    before: projects[2],
    after: projects[3],
  },
  {
    title: 'Protection et finition',
    before: projects[4],
    after: projects[5],
  },
]

export default function Gallery() {
  const [activeFilter, setActiveFilter] = useState('Tous')
  const [menuOpen, setMenuOpen] = useState(false)
  const [siteContent, setSiteContent] = useState(null)
  const [contentError, setContentError] = useState('')
  const [projectsHighlight, setProjectsHighlight] = useState(0)
  const [comparisonHighlight, setComparisonHighlight] = useState(0)
  const [selectedProject, setSelectedProject] = useState(null)
  const [selectedComparison, setSelectedComparison] = useState(null)
  const closeButtonRef = useRef(null)
  const openerRef = useRef(null)
  const galleryProjects = siteContent?.galleryProjects || projects
  const comparisons = siteContent?.beforeAfter || beforeAfterExamples
  const filters = ['Tous', ...new Set(galleryProjects.map(({ category }) => category))]
  const comparisonDeepLink = new URLSearchParams(window.location.hash.split('?')[1] || '')
    .get('section') === 'gallery-before-after'
  const visibleProjects = activeFilter === 'Tous'
    ? galleryProjects
    : galleryProjects.filter((project) => project.category === activeFilter)
  const headerSocials = getSocialLinks(siteContent?.socials).slice(0, 3)

  useEffect(() => {
    fetch('/api/content')
      .then((res) => {
        if (!res.ok) throw new Error('Could not load site content')
        return res.json()
      })
      .then(setSiteContent)
      .catch(() => setContentError('Impossible de charger le contenu de la galerie. Réessayez plus tard.'))
  }, [])

  function scrollToSection(event, sectionId) {
    event.preventDefault()
    setMenuOpen(false)
    if (sectionId === 'gallery-projects') {
      setProjectsHighlight((version) => version + 1)
      setActiveFilter('Tous')
    } else if (sectionId === 'gallery-before-after') {
      setComparisonHighlight((version) => version + 1)
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (!siteContent) return
    const queryStart = window.location.hash.indexOf('?')
    if (queryStart === -1) return

    const section = new URLSearchParams(window.location.hash.slice(queryStart + 1)).get('section')
    if (section !== 'gallery-before-after') return

    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [siteContent])

  useEffect(() => {
    if (!selectedProject && !selectedComparison) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedProject(null)
        setSelectedComparison(null)
      }
      if (event.key === 'Tab') {
        event.preventDefault()
        closeButtonRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      openerRef.current?.focus()
    }
  }, [selectedProject, selectedComparison])

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner gallery-header">
          <a className="brand" href="#/" aria-label="Polish Pro - accueil">Polish Pro</a>
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
            <nav className="top-nav gallery-top-nav" aria-label="Navigation galerie">
              <a href="#gallery-projects" onClick={(event) => scrollToSection(event, 'gallery-projects')}>
                Nos réalisations
              </a>
              <a href="#gallery-before-after" onClick={(event) => scrollToSection(event, 'gallery-before-after')}>
                Avant & Après
              </a>
              <a className="gallery-quote-link" href="#services" onClick={() => setMenuOpen(false)}>
                Demander un devis
              </a>
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

      <main className="gallery-page">
        {contentError && <p className="error" role="alert">{contentError}</p>}
        <header className="gallery-intro">
          <p className="hero-eyebrow">Le soin du détail</p>
          <h1>Nos réalisations</h1>
          <p>Découvrez des exemples de finitions et de soins réalisés sur différents véhicules.</p>
          <p className="gallery-disclaimer">
          Photos de démonstration — remplacez-les par vos propres réalisations.
          </p>
        </header>

        <div className="gallery-filters" role="group" aria-label="Filtrer les réalisations">
          {filters.map((filter) => (
            <button
              className={`gallery-filter${activeFilter === filter ? ' active' : ''}`}
              key={filter}
              type="button"
              aria-pressed={activeFilter === filter}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        <section
          id="gallery-projects"
          className="gallery-grid"
          aria-label="Galerie de réalisations"
        >
          {visibleProjects.map((project) => (
            <article
              className={`gallery-card${projectsHighlight ? ' gallery-project-card-highlight' : ''}`}
              key={`${project.title}-${projectsHighlight}`}
              role="button"
              tabIndex={0}
              aria-label={`Voir l'image en grand : ${project.title}`}
              onClick={(event) => {
                openerRef.current = event.currentTarget
                setSelectedComparison(null)
                setSelectedProject(project)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  openerRef.current = event.currentTarget
                  setSelectedComparison(null)
                  setSelectedProject(project)
                }
              }}
            >
              <img src={project.image} alt={project.alt} loading="lazy" />
              <div className="gallery-card-copy">
                <span>{project.category}</span>
                <h2>{project.title}</h2>
                <p>{project.description}</p>
              </div>
            </article>
          ))}
        </section>

        <section id="gallery-before-after" className="gallery-before-after" aria-labelledby="gallery-before-after-title">
          <header className="section-heading">
            <h2 id="gallery-before-after-title">Avant & Après</h2>
            <p>Découvrez la différence apportée par un detailing soigné.</p>
          </header>
          <div className="gallery-before-after-grid">
            {comparisons.map(({ title, before, after }) => (
              <article
                className={`gallery-before-after-card${comparisonHighlight || comparisonDeepLink ? ' gallery-before-after-highlight' : ''}`}
                key={`${title}-${comparisonHighlight}`}
                role="button"
                tabIndex={0}
                aria-label={`Voir la comparaison avant et après : ${title}`}
                onClick={(event) => {
                  openerRef.current = event.currentTarget
                  setSelectedProject(null)
                  setSelectedComparison({ title, before, after })
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openerRef.current = event.currentTarget
                    setSelectedProject(null)
                    setSelectedComparison({ title, before, after })
                  }
                }}
              >
                <h3>{title}</h3>
                <div className="gallery-before-after-images">
                  <figure>
                    <img src={before.image} alt={`Avant : ${before.alt}`} loading="lazy" />
                    <figcaption>Avant</figcaption>
                  </figure>
                  <figure>
                    <img src={after.image} alt={`Après : ${after.alt}`} loading="lazy" />
                    <figcaption>Après</figcaption>
                  </figure>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {(selectedProject || selectedComparison) && (
        <div
          className="gallery-lightbox"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedProject(null)
              setSelectedComparison(null)
            }
          }}
        >
          <section
            className={`gallery-lightbox-panel${selectedComparison ? ' comparison-open' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gallery-lightbox-title"
          >
            <button
              ref={closeButtonRef}
              className="gallery-lightbox-close"
              type="button"
              aria-label="Fermer l'image"
              onClick={() => {
                setSelectedProject(null)
                setSelectedComparison(null)
              }}
            >
              <span aria-hidden="true">&times;</span>
            </button>
            {selectedComparison ? (
              <div className="gallery-lightbox-comparison">
                <figure>
                  <img src={selectedComparison.before.image} alt={`Avant : ${selectedComparison.before.alt}`} />
                  <figcaption>Avant</figcaption>
                </figure>
                <figure>
                  <img src={selectedComparison.after.image} alt={`Après : ${selectedComparison.after.alt}`} />
                  <figcaption>Après</figcaption>
                </figure>
              </div>
            ) : (
              <img className="gallery-lightbox-image" src={selectedProject.image} alt={selectedProject.alt} />
            )}
            <div className="gallery-lightbox-copy">
              {selectedComparison ? (
                <>
                  <span>Avant & Après</span>
                  <h2 id="gallery-lightbox-title">{selectedComparison.title}</h2>
                </>
              ) : (
                <>
                  <span>{selectedProject.category}</span>
                  <h2 id="gallery-lightbox-title">{selectedProject.title}</h2>
                  <p>{selectedProject.description}</p>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      <SiteFooter socials={siteContent?.socials} description={siteContent?.contact?.description} />
    </>
  )
}
