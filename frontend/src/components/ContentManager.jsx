import { useCallback, useEffect, useState } from 'react'

const sections = [
  ['services', 'Services'],
  ['home', 'Avant / Après accueil'],
  ['gallery', 'Galerie'],
  ['comparisons', 'Comparaisons galerie'],
  ['reviews', 'Avis clients'],
  ['business', 'Contact et réseaux'],
]

const blankService = { name: '', description: '', price_eur: '', duration_min: '' }
const blankHomeImage = { label: '', description: '', image: '', alt: '' }
const blankProject = { title: '', category: 'Polissage', description: '', image: '', alt: '' }
const blankComparison = {
  title: '',
  before: { image: '', alt: '' },
  after: { image: '', alt: '' },
}
const blankReview = { name: '', rating: 5, quote: '' }
const socialLabels = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  youtube: 'YouTube',
  x: 'X',
  snapchat: 'Snapchat',
}

function Field({ label, value, onChange, type = 'text', multiline = false, ...props }) {
  const Component = multiline ? 'textarea' : 'input'
  return (
    <label className="admin-field">
      {label}
      <Component
        type={multiline ? undefined : type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </label>
  )
}

export default function ContentManager({ token, logout, onServicesChanged }) {
  const [section, setSection] = useState('services')
  const [content, setContent] = useState(null)
  const [services, setServices] = useState([])
  const [newService, setNewService] = useState(blankService)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(path, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })
    if (response.status === 401) {
      logout()
      return null
    }
    const result = response.status === 204 ? {} : await response.json()
    if (!response.ok) throw new Error(result?.error || 'La requête a échoué.')
    return result
  }, [token, logout])

  const load = useCallback(async () => {
    setError('')
    try {
      const [contentResult, serviceResult] = await Promise.all([
        request('/api/admin/content'),
        request('/api/services'),
      ])
      if (!contentResult || !serviceResult) return
      setContent(contentResult.content)
      setServices(serviceResult)
    } catch (loadError) {
      setError(loadError.message)
    }
  }, [request])

  useEffect(() => {
    load()
  }, [load])

  function updateArrayItem(arrayKey, index, field, value) {
    setContent((current) => ({
      ...current,
      [arrayKey]: current[arrayKey].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }))
    setNotice('')
  }

  function updateNestedArrayItem(arrayKey, index, group, field, value) {
    setContent((current) => ({
      ...current,
      [arrayKey]: current[arrayKey].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [group]: { ...item[group], [field]: value } } : item
      ),
    }))
    setNotice('')
  }

  function updateContact(field, value) {
    setContent((current) => ({
      ...current,
      contact: { ...current.contact, [field]: value },
    }))
    setNotice('')
  }

  function updateSocial(field, value) {
    setContent((current) => ({
      ...current,
      socials: { ...current.socials, [field]: value },
    }))
    setNotice('')
  }

  async function saveContent(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await request('/api/admin/content', {
        method: 'PUT',
        body: JSON.stringify(content),
      })
      if (!result) return
      setContent(result.content)
      setNotice('Contenu enregistré. Les modifications sont maintenant visibles sur le site.')
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveService(service) {
    setError('')
    setNotice('')
    try {
      const result = await request(`/api/admin/services/${service.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...service,
          price_eur: Number(service.price_eur),
          duration_min: Number(service.duration_min),
        }),
      })
      if (!result) return
      setServices((current) => current.map((item) => item.id === result.id ? result : item))
      setNotice('Service enregistré.')
      onServicesChanged()
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  async function createService(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    try {
      const result = await request('/api/admin/services', {
        method: 'POST',
        body: JSON.stringify({
          ...newService,
          price_eur: Number(newService.price_eur),
          duration_min: Number(newService.duration_min),
        }),
      })
      if (!result) return
      setServices((current) => [...current, result])
      setNewService(blankService)
      setNotice('Nouveau service ajouté.')
      onServicesChanged()
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  async function deleteService(service) {
    if (!window.confirm(`Supprimer le service « ${service.name} » ?`)) return
    setError('')
    setNotice('')
    try {
      const result = await request(`/api/admin/services/${service.id}`, { method: 'DELETE' })
      if (result === null) return
      setServices((current) => current.filter((item) => item.id !== service.id))
      setNotice('Service supprimé.')
      onServicesChanged()
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  function addItem(arrayKey, blankItem) {
    const item = blankItem.before
      ? { ...blankItem, before: { ...blankItem.before }, after: { ...blankItem.after } }
      : { ...blankItem }
    setContent((current) => ({ ...current, [arrayKey]: [...current[arrayKey], item] }))
    setNotice('')
  }

  function removeItem(arrayKey, index) {
    setContent((current) => ({
      ...current,
      [arrayKey]: current[arrayKey].filter((_, itemIndex) => itemIndex !== index),
    }))
    setNotice('')
  }

  if (!content) {
    return (
      <section className="admin-content">
        {error ? <p className="error" role="alert">{error}</p> : <p className="meta">Chargement du contenu…</p>}
      </section>
    )
  }

  return (
    <section className="admin-content">
      <div className="admin-content-tabs" role="tablist" aria-label="Rubriques du contenu">
        {sections.map(([id, label]) => (
          <button
            key={id}
            className={`slot ${section === id ? 'active' : ''}`}
            type="button"
            role="tab"
            aria-selected={section === id}
            onClick={() => { setSection(id); setError(''); setNotice('') }}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="success" role="status">{notice}</p>}

      {section === 'services' && (
        <div className="admin-editor-list">
          <p className="meta">Les services sont utilisés sur la page d’accueil et dans le formulaire de rendez-vous.</p>
          {services.map((service) => (
            <form
              className="admin-editor-card"
              key={service.id}
              onSubmit={(event) => { event.preventDefault(); saveService(service) }}
            >
              <div className="admin-editor-fields">
                <Field label="Nom" value={service.name} onChange={(value) => setServices((items) => items.map((item) => item.id === service.id ? { ...item, name: value } : item))} required maxLength={120} />
                <Field label="Description" value={service.description} onChange={(value) => setServices((items) => items.map((item) => item.id === service.id ? { ...item, description: value } : item))} multiline required maxLength={1000} />
                <Field label="Prix (€)" type="number" min="0" step="1" value={service.price_eur} onChange={(value) => setServices((items) => items.map((item) => item.id === service.id ? { ...item, price_eur: value } : item))} required />
                <Field label="Durée (minutes)" type="number" min="1" max="1440" step="1" value={service.duration_min} onChange={(value) => setServices((items) => items.map((item) => item.id === service.id ? { ...item, duration_min: value } : item))} required />
              </div>
              <div className="actions">
                <button className="btn" type="submit">Enregistrer</button>
                <button className="slot" type="button" onClick={() => deleteService(service)}>Supprimer</button>
              </div>
            </form>
          ))}
          <form className="admin-editor-card" onSubmit={createService}>
            <h3>Ajouter un service</h3>
            <div className="admin-editor-fields">
              <Field label="Nom" value={newService.name} onChange={(value) => setNewService((item) => ({ ...item, name: value }))} required maxLength={120} />
              <Field label="Description" value={newService.description} onChange={(value) => setNewService((item) => ({ ...item, description: value }))} multiline required maxLength={1000} />
              <Field label="Prix (€)" type="number" min="0" step="1" value={newService.price_eur} onChange={(value) => setNewService((item) => ({ ...item, price_eur: value }))} required />
              <Field label="Durée (minutes)" type="number" min="1" max="1440" step="1" value={newService.duration_min} onChange={(value) => setNewService((item) => ({ ...item, duration_min: value }))} required />
            </div>
            <button className="btn" type="submit">Ajouter le service</button>
          </form>
        </div>
      )}

      {section === 'home' && (
        <form onSubmit={saveContent}>
          <p className="meta">Ces images et textes apparaissent dans la section Avant & Après de l’accueil.</p>
          <div className="admin-editor-list">
            {content.homeBeforeAfter.map((item, index) => (
              <article className="admin-editor-card" key={`home-${index}`}>
                <h3>{item.label || `Image ${index + 1}`}</h3>
                <div className="admin-editor-fields">
                  <Field label="Libellé" value={item.label} onChange={(value) => updateArrayItem('homeBeforeAfter', index, 'label', value)} required maxLength={30} />
                  <Field label="Texte descriptif" value={item.description} onChange={(value) => updateArrayItem('homeBeforeAfter', index, 'description', value)} multiline required maxLength={500} />
                  <Field label="URL de l’image" type="url" value={item.image} onChange={(value) => updateArrayItem('homeBeforeAfter', index, 'image', value)} required />
                  <Field label="Texte alternatif" value={item.alt} onChange={(value) => updateArrayItem('homeBeforeAfter', index, 'alt', value)} required maxLength={250} />
                </div>
                <button className="slot" type="button" onClick={() => removeItem('homeBeforeAfter', index)}>
                  Supprimer cette image
                </button>
              </article>
            ))}
          </div>
          <div className="actions">
            <button className="slot" type="button" onClick={() => addItem('homeBeforeAfter', blankHomeImage)}>
              Ajouter une image
            </button>
            <button className="btn" type="submit" disabled={saving}>Enregistrer les images d’accueil</button>
          </div>
        </form>
      )}

      {section === 'gallery' && (
        <form onSubmit={saveContent}>
          <p className="meta">Images de la grille Galerie. Utilisez des URL d’images HTTPS accessibles publiquement.</p>
          <div className="admin-editor-list">
            {content.galleryProjects.map((project, index) => (
              <article className="admin-editor-card" key={`project-${index}`}>
                <div className="admin-editor-fields">
                  <Field label="Titre" value={project.title} onChange={(value) => updateArrayItem('galleryProjects', index, 'title', value)} required maxLength={120} />
                  <label className="admin-field">
                    Catégorie
                    <select value={project.category} onChange={(event) => updateArrayItem('galleryProjects', index, 'category', event.target.value)}>
                      {['Polissage', 'Protection', 'Detailing'].map((category) => <option key={category}>{category}</option>)}
                    </select>
                  </label>
                  <Field label="Description" value={project.description} onChange={(value) => updateArrayItem('galleryProjects', index, 'description', value)} multiline required maxLength={500} />
                  <Field label="URL de l’image" type="url" value={project.image} onChange={(value) => updateArrayItem('galleryProjects', index, 'image', value)} required />
                  <Field label="Texte alternatif" value={project.alt} onChange={(value) => updateArrayItem('galleryProjects', index, 'alt', value)} required maxLength={250} />
                </div>
                <button className="slot" type="button" onClick={() => removeItem('galleryProjects', index)}>Supprimer cette réalisation</button>
              </article>
            ))}
          </div>
          <div className="actions">
            <button className="slot" type="button" onClick={() => addItem('galleryProjects', blankProject)}>Ajouter une réalisation</button>
            <button className="btn" type="submit" disabled={saving}>Enregistrer la galerie</button>
          </div>
        </form>
      )}

      {section === 'comparisons' && (
        <form onSubmit={saveContent}>
          <p className="meta">Les comparaisons Avant & Après affichées sous les six réalisations de la galerie.</p>
          <div className="admin-editor-list">
            {content.beforeAfter.map((comparison, index) => (
              <article className="admin-editor-card" key={`comparison-${index}`}>
                <Field label="Titre de la comparaison" value={comparison.title} onChange={(value) => updateArrayItem('beforeAfter', index, 'title', value)} required maxLength={120} />
                <div className="admin-editor-fields">
                  {['before', 'after'].map((group) => (
                    <div className="admin-editor-subcard" key={group}>
                      <h3>{group === 'before' ? 'Avant' : 'Après'}</h3>
                      <Field label="URL de l’image" type="url" value={comparison[group].image} onChange={(value) => updateNestedArrayItem('beforeAfter', index, group, 'image', value)} required />
                      <Field label="Texte alternatif" value={comparison[group].alt} onChange={(value) => updateNestedArrayItem('beforeAfter', index, group, 'alt', value)} required maxLength={250} />
                    </div>
                  ))}
                </div>
                <button className="slot" type="button" onClick={() => removeItem('beforeAfter', index)}>Supprimer cette comparaison</button>
              </article>
            ))}
          </div>
          <div className="actions">
            <button className="slot" type="button" onClick={() => addItem('beforeAfter', blankComparison)}>Ajouter une comparaison</button>
            <button className="btn" type="submit" disabled={saving}>Enregistrer les comparaisons</button>
          </div>
        </form>
      )}

      {section === 'reviews' && (
        <form onSubmit={saveContent}>
          <p className="meta">Les avis affichés sont des exemples fictifs à remplacer par de vrais retours clients.</p>
          <div className="admin-editor-list">
            {content.reviews.map((review, index) => (
              <article className="admin-editor-card" key={`review-${index}`}>
                <div className="admin-editor-fields">
                  <Field label="Nom affiché" value={review.name} onChange={(value) => updateArrayItem('reviews', index, 'name', value)} required maxLength={100} />
                  <label className="admin-field">
                    Note
                    <select value={review.rating} onChange={(event) => updateArrayItem('reviews', index, 'rating', Number(event.target.value))}>
                      {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}
                    </select>
                  </label>
                  <Field label="Avis" value={review.quote} onChange={(value) => updateArrayItem('reviews', index, 'quote', value)} multiline required maxLength={1000} />
                </div>
                <button className="slot" type="button" onClick={() => removeItem('reviews', index)}>Supprimer cet avis</button>
              </article>
            ))}
          </div>
          <div className="actions">
            <button className="slot" type="button" onClick={() => addItem('reviews', blankReview)}>Ajouter un avis</button>
            <button className="btn" type="submit" disabled={saving}>Enregistrer les avis</button>
          </div>
        </form>
      )}

      {section === 'business' && (
        <form onSubmit={saveContent}>
          <div className="admin-editor-card">
            <h3>Coordonnées et présentation</h3>
            <div className="admin-editor-fields">
              <Field label="Nom du contact" value={content.contact.name} onChange={(value) => updateContact('name', value)} required maxLength={120} />
              <Field label="Téléphone" value={content.contact.phone} onChange={(value) => updateContact('phone', value)} required maxLength={80} />
              <Field label="Adresse affichée et localisation de la carte" value={content.contact.address} onChange={(value) => updateContact('address', value)} required maxLength={250} />
              <Field label="Description de l’entreprise" value={content.contact.description} onChange={(value) => updateContact('description', value)} multiline required maxLength={300} />
              <Field label="Mention affichée sur le contact" value={content.contact.note} onChange={(value) => updateContact('note', value)} maxLength={100} />
            </div>
          </div>
          <div className="admin-editor-card">
            <h3>Liens des réseaux sociaux</h3>
            <p className="meta">Laissez un lien vide pour masquer ce réseau. Les liens doivent commencer par https://.</p>
            <div className="admin-editor-fields">
              {Object.entries(socialLabels).map(([key, label]) => (
                <Field key={key} label={label} type="url" value={content.socials[key]} onChange={(value) => updateSocial(key, value)} />
              ))}
            </div>
          </div>
          <button className="btn" type="submit" disabled={saving}>Enregistrer les coordonnées et liens</button>
        </form>
      )}
    </section>
  )
}
