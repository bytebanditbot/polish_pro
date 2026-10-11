import { useState } from 'react'

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const fmtDate = (value, withTime = false) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '–'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

const STYLES = `
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 12px; line-height: 1.5; margin: 0; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #999; }
  .brand { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #555; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 6px 8px; border: 1px solid #ccc; vertical-align: top; }
  td.k { width: 30%; background: #f3f3f3; font-weight: 700; }
  .msg { white-space: pre-wrap; border-left: 3px solid #999; padding-left: 10px; }
  .mail { border: 1px solid #ccc; padding: 8px 10px; margin-bottom: 8px; page-break-inside: avoid; }
  .mail .head { display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 4px; }
  .mail .head span { font-weight: 400; color: #555; }
  .mail p { margin: 0; white-space: pre-wrap; }
  .certificate { font-size: 14px; line-height: 1.9; }
  .certificate h1 { text-align: center; text-transform: uppercase; letter-spacing: .08em; margin: 30px 0 40px; }
  .signatures { display: flex; justify-content: space-between; margin-top: 70px; }
  .signatures div { width: 45%; border-top: 1px solid #111; padding-top: 6px; }
`

function openPrint(title, body) {
  const win = window.open('', '_blank', 'width=900,height=1000')
  if (!win) {
    window.alert('Autorisez les fenêtres pop-up pour imprimer.')
    return
  }
  win.document.write(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${STYLES}</style></head><body>${body}</body></html>`
  )
  win.document.close()
  win.focus()
  win.onload = () => win.print()
  setTimeout(() => win.print(), 400)
}

function clientSheetHtml(inquiry, conversation, includeConversation) {
  const rows = [
    ['Client', inquiry.customer_name],
    ['E-mail', inquiry.customer_email],
    ['Téléphone', inquiry.customer_phone || '–'],
    ['Service', inquiry.service_name || '–'],
    ['Tarif', inquiry.service_price_eur != null ? `${inquiry.service_price_eur} €` : '–'],
    ['Véhicule', inquiry.car_model || '–'],
    ['Reçue le', fmtDate(inquiry.created_at, true)],
    ['Statut', inquiry.archived ? 'Archivée' : inquiry.status === 'handled' ? 'Traitée' : 'Nouvelle'],
  ]
    .map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`)
    .join('')

  let html = `
    <div class="brand">Polish Pro</div>
    <h1>Fiche client</h1>
    <div>Référence PP-${esc(inquiry.id)}</div>
    <h2>Informations</h2>
    <table>${rows}</table>
    <h2>Demande</h2>
    <div class="msg">${esc(inquiry.message)}</div>`

  if (includeConversation) {
    html += '<h2>Conversation e-mail</h2>'
    html += conversation.length
      ? conversation
          .map(
            (m) => `<div class="mail">
              <div class="head">${m.direction === 'admin' ? 'Polish Pro' : esc(inquiry.customer_name)}
                <span>${esc(fmtDate(m.date, true))}</span></div>
              <p>${esc(m.body)}</p></div>`
          )
          .join('')
      : '<p>Aucun e-mail dans la conversation.</p>'
  }
  return html
}

function certificateHtml(inquiry) {
  return `
    <div class="brand">Polish Pro</div>
    <div class="certificate">
      <h1>Attestation de travaux</h1>
      <p>Nous soussignés, <strong>Polish Pro</strong>, attestons avoir réalisé sur le véhicule
        <strong>${esc(inquiry.car_model || '____________________')}</strong>
        appartenant à <strong>${esc(inquiry.customer_name)}</strong> la prestation suivante :</p>
      <p><strong>${esc(inquiry.service_name || '____________________')}</strong>${
        inquiry.service_price_eur != null ? ` (${esc(inquiry.service_price_eur)} €)` : ''
      }</p>
      <p>Date de réalisation des travaux : ____ / ____ / ________</p>
      <p>Référence : PP-${esc(inquiry.id)}</p>
      <p>Attestation établie pour servir et valoir ce que de droit.</p>
      <p>Fait le ${esc(fmtDate(new Date()))}</p>
      <div class="signatures">
        <div>Signature Polish Pro</div>
        <div>Signature du client</div>
      </div>
    </div>`
}

export default function InquiryTools({ inquiry, conversation, conversationLoading }) {
  const [includeConversation, setIncludeConversation] = useState(false)

  return (
    <div className="inquiry-tools">
      <label className="inquiry-tools-check">
        <input
          type="checkbox"
          checked={includeConversation}
          onChange={(event) => setIncludeConversation(event.target.checked)}
        />
        Inclure la conversation e-mail
      </label>
      <button
        className="slot"
        type="button"
        disabled={includeConversation && conversationLoading}
        onClick={() =>
          openPrint(
            `Fiche client – ${inquiry.customer_name}`,
            clientSheetHtml(inquiry, conversation, includeConversation)
          )
        }
      >
        Imprimer la fiche client
      </button>
      <button
        className="slot"
        type="button"
        onClick={() => openPrint(`Attestation de travaux – ${inquiry.customer_name}`, certificateHtml(inquiry))}
      >
        Attestation de travaux
      </button>
    </div>
  )
}
