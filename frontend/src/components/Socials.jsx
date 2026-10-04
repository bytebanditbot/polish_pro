import { getSocialLinks } from './social-links'

export function SocialIcon({ type }) {
  if (type === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="social-icon">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
      </svg>
    )
  }

  if (type === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="social-icon">
        <path d="M15.5 3.5c.7 1.8 2.1 3.1 4 3.7v2.8a7.2 7.2 0 0 1-4-1.2v7.2a5.5 5.5 0 1 1-5.5-5.5c.3 0 .6 0 .9.1v2.9a2.8 2.8 0 1 0 2 2.7V3.5h2.6Z" fill="currentColor" />
      </svg>
    )
  }

  if (type === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="social-icon">
        <path d="M13.6 21v-8.3h2.7l.4-3.1h-3.1V7.3c0-.9.3-1.5 1.6-1.5h1.7V2.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.4v2.4H7.5v3.1h2.7V21h3.4Z" fill="currentColor" />
      </svg>
    )
  }

  if (type === 'x') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="social-icon">
        <path d="M18.9 3h2.9l-6.4 7.3L22 21h-5.8l-4.5-6.5L6.6 21H3.7l6.9-7.8L2 3h5.9l4.1 5.9L18.9 3Zm-1 16.2h1.6L7.2 4.7H5.5l12.4 14.5Z" fill="currentColor" />
      </svg>
    )
  }

  if (type === 'snapchat') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="social-icon">
        <path d="M12 3.5c2.6 0 4.8 1.7 4.8 4.2 0 1.7-1 3.2-2.5 3.9.1 1.1.4 2 .8 2.8.8 1.5 2.8 2.1 3.9 2.4.5.1.7.7.4 1.1-.5.7-1.5 1.2-2.3 1.5-.7.3-1.4.4-1.8.8-.2.2-.2.6.1.8.5.5 1.1 1.1 1.3 1.8.2.7-.2 1.3-1 1.3h-1.2c-.8 0-1.5-.4-2-.9-.5-.4-.8-.9-1.4-.9-.5 0-.9.5-1.4.9-.5.5-1.2.9-2 .9H7.4c-.8 0-1.2-.6-1-1.3.2-.7.8-1.3 1.3-1.8.3-.2.3-.6.1-.8-.4-.4-1.1-.5-1.8-.8-.8-.3-1.8-.8-2.3-1.5-.3-.4-.1-1 .4-1.1 1.1-.3 3.1-.9 3.9-2.4.4-.8.7-1.7.8-2.8-1.5-.7-2.5-2.2-2.5-3.9 0-2.5 2.2-4.2 4.8-4.2Zm0 1.8c-1.7 0-3 1.1-3 2.4 0 1.3 1.3 2.4 3 2.4 1.7 0 3-1.1 3-2.4 0-1.3-1.3-2.4-3-2.4Z" fill="currentColor" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="social-icon">
      <rect x="3.5" y="5.5" width="17" height="13" rx="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 9.5v5l5-2.5-5-2.5Z" fill="currentColor" />
    </svg>
  )
}

const footerYear = new Date().getFullYear()

export default function SiteFooter({ socials, description }) {
  const links = getSocialLinks(socials)
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <div className="brand">Polish Pro</div>
          <p>{description || 'Finitions et detailing automobile professionnels.'}</p>
        </div>

        <div className="footer-links">
          <h3>Suivez-nous</h3>
          <div className="social-links footer-socials">
            {links.map(({ label, href, type }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}>
                <SocialIcon type={type} />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="footer-bottom">© {footerYear} Polish Pro</div>
    </footer>
  )
}
