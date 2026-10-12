import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/base.css'
import './styles/gallery.css'
import './styles/site.css'
import './styles/admin.css'
import './styles/admin-ui.css'
import App from './App.jsx'
import Gallery from './Gallery.jsx'
import Admin from './components/Admin.jsx'

function Root() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  if (hash === '#/admin') return <Admin />
  if (hash === '#/gallery' || hash.startsWith('#/gallery?')) return <Gallery />
  return <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
)
