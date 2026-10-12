// A4 printing for the admin area: the inquiries table, a single client sheet
// and a job completion certificate. Everything goes through the browser print
// dialog, which also offers "Save as PDF" — no extra dependency needed.

const COLUMNS = ['Client', 'E-mail', 'Service', 'Véhicule', 'Reçue le', 'Statut']

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const longDateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '–' : dateFormat.format(date)
}

function formatDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '–'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

// 210 minutes -> "3 h 30", 90 -> "1 h 30", 45 -> "45 min"
export function formatDuration(totalMinutes) {
  const minutes = Math.round(Number(totalMinutes))
  if (!Number.isFinite(minutes) || minutes <= 0) return '–'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`
}

function formatPrice(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '–'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

function statusLabel(inquiry) {
  if (inquiry.archived) return 'Archivée'
  return inquiry.status === 'handled' ? 'Traitée' : 'Nouvelle'
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function cleanBody(body) {
  return String(body ?? '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

const BASE_STYLE = `
  * { box-sizing: border-box; }
  body { margin: 0; font: 11px/1.45 Arial, Helvetica, sans-serif; color: #111; }
  h1 { margin: 0 0 2px; font-size: 18px; }
  h2 { margin: 18px 0 6px; font-size: 13px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
  p { margin: 0 0 8px; }
  .muted { color: #555; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 6px 8px; border: 1px solid #ccc; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
  th { background: #141c26; color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .facts th { width: 32%; background: #f0f3f7; color: #111; }
  .message { white-space: pre-wrap; overflow-wrap: anywhere; }
  .entry { margin: 0 0 8px; padding: 6px 8px; border: 1px solid #ddd; break-inside: avoid; }
  .entry-head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 3px; font-weight: 700; }
  .entry-head span { font-weight: 400; color: #555; }
`

function wrapHtml(title, pageRule, extraStyle, body) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  @page { ${pageRule} }
  ${BASE_STYLE}
  ${extraStyle}
</style>
</head>
<body>
${body}
</body>
</html>`
}

// Opens the print dialog through a hidden iframe, so no popup blocker is
// involved. Choose "Save as PDF" as destination to get a PDF file.
function printHtml(html) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(frame)

  frame.onload = () => {
    const win = frame.contentWindow
    win.onafterprint = () => frame.remove()
    win.focus()
    win.print()
  }
  frame.srcdoc = html
}

// ── Inquiries table (A4 landscape) ────────────────────────────────────────

export function printInquiries(inquiries, title = 'Demandes clients') {
  const rows = inquiries
    .map((inquiry) => [
      inquiry.customer_name,
      inquiry.customer_email,
      inquiry.service_name || '–',
      inquiry.car_model || '–',
      formatDate(inquiry.created_at),
      statusLabel(inquiry),
    ])
    .map((cells) => `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('')

  printHtml(wrapHtml(
    title,
    'size: A4 landscape; margin: 12mm;',
    `thead { display: table-header-group; }
     tr { break-inside: avoid; }
     tbody tr:nth-child(even) td { background: #f5f7fa; -webkit-print-color-adjust: exact; print-color-adjust: exact; }`,
    `<h1>Polish Pro – ${escapeHtml(title)}</h1>
  <p class="muted">${inquiries.length} demande(s) · ${escapeHtml(new Date().toLocaleString('fr-FR'))}</p>
  <table>
    <thead><tr>${COLUMNS.map((column) => `<th>${column}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`
  ))
}

// ── Single client sheet (A4 portrait) ─────────────────────────────────────

// `conversation` is an array of Gmail messages, or null to leave it out.
export function printClientSheet(inquiry, conversation = null) {
  const facts = [
    ['Nom', inquiry.customer_name],
    ['E-mail', inquiry.customer_email],
    ['Téléphone', inquiry.customer_phone || '–'],
    ['Véhicule', inquiry.car_model || '–'],
    ['Service', inquiry.service_name || '–'],
    ['Prix du service', inquiry.service_price_eur != null ? formatPrice(inquiry.service_price_eur) : '–'],
    ['Reçue le', formatDateTime(inquiry.created_at)],
    ['Statut', statusLabel(inquiry)],
  ]
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join('')

  let conversationHtml = ''
  if (conversation) {
    const entries = [
      {
        who: `${inquiry.customer_name} (demande envoyée depuis le site)`,
        when: formatDateTime(inquiry.created_at),
        body: inquiry.message,
      },
      ...conversation.map((message) => ({
        who: message.direction === 'admin' ? 'Polish Pro' : inquiry.customer_name,
        when: formatDateTime(message.date),
        body: message.body,
      })),
    ]
      .map((entry) => `<div class="entry">
        <div class="entry-head">${escapeHtml(entry.who)}<span>${escapeHtml(entry.when)}</span></div>
        <div class="message">${escapeHtml(cleanBody(entry.body))}</div>
      </div>`)
      .join('')
    conversationHtml = `<h2>Conversation</h2>${entries}`
  } else {
    conversationHtml = `<h2>Message du client</h2>
      <div class="entry"><div class="message">${escapeHtml(cleanBody(inquiry.message))}</div></div>`
  }

  printHtml(wrapHtml(
    `Fiche client – ${inquiry.customer_name}`,
    'size: A4 portrait; margin: 15mm;',
    '',
    `<h1>Polish Pro – Fiche client</h1>
  <p class="muted">Demande n° ${escapeHtml(inquiry.id)} · imprimée le ${escapeHtml(new Date().toLocaleString('fr-FR'))}</p>
  <table class="facts"><tbody>${facts}</tbody></table>
  ${conversationHtml}`
  ))
}

// ── Job completion certificate (A4 portrait) ──────────────────────────────

// details: { date: 'YYYY-MM-DD', minutes: number, price: number }
// business: optional { name, phone, address } shown in the header
export function printCertificate(inquiry, details, business = null) {
  const completed = new Date(`${details.date}T12:00:00`)
  const completedLabel = Number.isNaN(completed.getTime()) ? '–' : longDateFormat.format(completed)

  const rows = [
    ['Client', inquiry.customer_name],
    ['Véhicule', inquiry.car_model || '–'],
    ['Prestation réalisée', inquiry.service_name || '–'],
    ['Date de fin des travaux', completedLabel],
    ['Temps passé', formatDuration(details.minutes)],
    ['Prix', formatPrice(details.price)],
  ]
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join('')

  const businessLines = business
    ? [business.name, business.address, business.phone]
        .filter(Boolean)
        .map((line) => escapeHtml(line))
        .join('<br>')
    : ''

  printHtml(wrapHtml(
    `Attestation de travaux – ${inquiry.customer_name}`,
    'size: A4 portrait; margin: 20mm;',
    `.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 28px; }
     .brand { font-size: 22px; font-weight: 700; letter-spacing: 0.04em; }
     .title { margin: 0 0 18px; font-size: 20px; text-align: center; text-transform: uppercase; letter-spacing: 0.08em; }
     .facts th, .facts td { padding: 9px 10px; font-size: 12px; }
     .sign { display: flex; justify-content: space-between; gap: 40px; margin-top: 48px; }
     .sign div { flex: 1; min-height: 70px; border-top: 1px solid #999; padding-top: 4px; font-size: 10px; color: #555; }
     .note { margin-top: 28px; font-size: 10px; color: #666; }`,
    `<div class="head">
    <div class="brand">Polish Pro</div>
    <div class="muted" style="text-align:right">${businessLines}</div>
  </div>
  <h1 class="title">Attestation de travaux</h1>
  <p>Nous attestons que la prestation ci-dessous a été réalisée sur le véhicule du client.</p>
  <table class="facts"><tbody>${rows}</tbody></table>
  <div class="sign">
    <div>Date et signature du client</div>
    <div>Cachet et signature Polish Pro</div>
  </div>
  <p class="note">Attestation établie le ${escapeHtml(longDateFormat.format(new Date()))} (demande n° ${escapeHtml(inquiry.id)}). Ce document n’est pas une facture.</p>`
  ))
}
