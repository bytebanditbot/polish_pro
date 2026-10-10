// A4 printing of the admin inquiries table. The browser print dialog also
// offers "Save as PDF", so this covers both printing and PDF export without
// any extra dependency.

const COLUMNS = ['Client', 'E-mail', 'Service', 'Véhicule', 'Reçue le', 'Statut']

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '–' : dateFormat.format(date)
}

function statusLabel(inquiry) {
  if (inquiry.archived) return 'Archivée'
  return inquiry.status === 'handled' ? 'Traitée' : 'Nouvelle'
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildHtml(inquiries, title) {
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

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 11px/1.4 Arial, Helvetica, sans-serif; color: #111; }
  h1 { margin: 0 0 2px; font-size: 18px; }
  p { margin: 0 0 12px; color: #555; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th, td { padding: 6px 8px; border: 1px solid #ccc; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
  th { background: #141c26; color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  tbody tr:nth-child(even) td { background: #f5f7fa; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style>
</head>
<body>
  <h1>Polish Pro – ${escapeHtml(title)}</h1>
  <p>${inquiries.length} demande(s) · ${escapeHtml(new Date().toLocaleString('fr-FR'))}</p>
  <table>
    <thead><tr>${COLUMNS.map((column) => `<th>${column}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`
}

// Opens the print dialog (A4 landscape) through a hidden iframe, so no popup
// blocker is involved. Choose "Save as PDF" as destination to get a PDF file.
export function printInquiries(inquiries, title = 'Demandes clients') {
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
  frame.srcdoc = buildHtml(inquiries, title)
}
