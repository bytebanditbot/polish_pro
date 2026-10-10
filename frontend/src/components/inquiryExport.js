// PDF export and A4 printing for the admin inquiries table.

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

function toRows(inquiries) {
  return inquiries.map((inquiry) => [
    inquiry.customer_name,
    inquiry.customer_email,
    inquiry.service_name || '–',
    inquiry.car_model || '–',
    formatDate(inquiry.created_at),
    statusLabel(inquiry),
  ])
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fileStamp() {
  return new Date().toISOString().slice(0, 10)
}

// Downloads a real PDF (A4 landscape). jsPDF is loaded on demand so it
// does not weigh on the public site bundle.
export async function exportInquiriesPdf(inquiries, title = 'Demandes clients') {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const generated = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date())

  doc.setFontSize(16)
  doc.text(`Polish Pro – ${title}`, 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(110)
  doc.text(`${inquiries.length} demande(s) · généré le ${generated}`, 14, 22)

  autoTable(doc, {
    head: [COLUMNS],
    body: toRows(inquiries),
    startY: 27,
    margin: { left: 14, right: 14, bottom: 14 },
    styles: { fontSize: 9, cellPadding: 2.2, overflow: 'linebreak' },
    headStyles: { fillColor: [20, 28, 38], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    didDrawPage: () => {
      const { width, height } = doc.internal.pageSize
      doc.setFontSize(8)
      doc.setTextColor(130)
      doc.text(`Page ${doc.getNumberOfPages()}`, width - 14, height - 7, { align: 'right' })
    },
  })

  doc.save(`demandes-polish-pro-${fileStamp()}.pdf`)
}

// Prints the table on A4 through a hidden iframe (no popup blocker issues).
export function printInquiries(inquiries, title = 'Demandes clients') {
  const rows = toRows(inquiries)
    .map((cells) => `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('')

  const html = `<!doctype html>
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
  <p>${inquiries.length} demande(s) · imprimé le ${escapeHtml(new Date().toLocaleString('fr-FR'))}</p>
  <table>
    <thead><tr>${COLUMNS.map((column) => `<th>${column}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`

  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(frame)

  const cleanup = () => setTimeout(() => frame.remove(), 1000)
  frame.onload = () => {
    const win = frame.contentWindow
    win.onafterprint = cleanup
    win.focus()
    win.print()
  }
  frame.srcdoc = html
}
