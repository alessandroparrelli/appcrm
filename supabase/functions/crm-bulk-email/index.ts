const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL     = 'marketing@cnaroma.it'
const FROM_NAME      = 'CRM CNA Roma'
const PRIMARY        = '#5B5FEF'
const HEADER_DEFAULT = '#ffffff'
const LOGO_DEFAULT   = 'https://raw.githubusercontent.com/alessandroparrelli/fileappoggio/main/NUOVO-LOGO-CNA-ROMA-SOLO-ROMA.png'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
}

const STATI_LABEL: Record<string,string> = {
  da_contattare:           'Da contattare',
  assegnato:               'Assegnato',
  chiamata_effettuata:     'Chiamata effettuata',
  appuntamento_fissato:    'Appuntamento fissato',
  appuntamento_completato: 'Appuntamento completato',
  in_lavorazione:          'In lavorazione',
  chiuso_positivo:         'Chiuso positivo',
  chiuso_negativo:         'Chiuso negativo',
}

function escapeHtml(s: string): string {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function replaceVars(s: string, vars: Record<string,string>): string {
  return (s||'').replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '')
}

function cleanFontTags(html: string): string {
  return (html||'')
    .replace(/<font[^>]*face="([^"]*)"[^>]*>([\s\S]*?)<\/font>/gi, (_,ff,inn) => `<span style="font-family:${ff}">${inn}</span>`)
    .replace(/<font[^>]*size="([^"]*)"[^>]*>([\s\S]*?)<\/font>/gi, (_,sz,inn) => {
      const pm: Record<string,string> = {'1':'10','2':'12','3':'14','4':'16','5':'18','6':'22','7':'28'}
      return `<span style="font-size:${pm[sz]||'14'}px">${inn}</span>`
    })
    .replace(/<font[^>]*>/gi,'').replace(/<\/font>/gi,'')
}

function titoloToHtml(b: any, vars: Record<string,string>): string {
  let inner = ''
  if (b.html) {
    inner = cleanFontTags(replaceVars(b.html, vars))
  } else if (b.testo) {
    inner = replaceVars(b.testo, vars)
  }
  const level = b.livello || 1
  const sizeMap: Record<number,string> = { 1: '22px', 2: '18px', 3: '15px' }
  const size = sizeMap[level] || '18px'
  return `<div style="font-family:Inter,Arial,sans-serif;font-size:${size};font-weight:700;line-height:1.3;color:#111827;margin:0 0 14px;">${inner}</div>`
}

const RLABELS: Record<string,string> = {
  azienda:          'Azienda',
  nome_azienda:     'Azienda',
  referente:        'Referente',
  titolare:         'Titolare',
  telefono:         'Telefono',
  email_contatto:   'Email',
  fonte:            'Fonte',
  stato:            'Stato',
  data_creazione:   'Data creazione',
  assegnato_a:      'Assegnato a',
  creato_da:        'Creato da',
  note:             'Note',
  associato:        'Associato',
  pagante:          'Pagante',
  mestiere_settore: 'Mestiere / Settore',
}

function blocchiToHtml(blocchi: any[], vars: Record<string,string>): string {
  return blocchi.map(b => {
    if (!b?.tipo) return ''

    if (b.tipo === 'testo')
      return `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.7;color:#374151;margin:0 0 16px;">${cleanFontTags(replaceVars(b.html||'',vars))}</div>`

    if (b.tipo === 'titolo')
      return titoloToHtml(b, vars)

    if (b.tipo === 'bottone') {
      const color  = b.color     || PRIMARY
      const tc     = b.textColor || '#ffffff'
      const radius = b.radius    || 12
      const align  = b.align     || 'center'
      return `<div style="text-align:${align};margin:20px 0;"><a href="${replaceVars(b.url||'#',vars)}" style="background:${color};color:${tc};padding:12px 30px;border-radius:${radius}px;text-decoration:none;font-size:15px;font-weight:700;display:inline-block;font-family:Inter,Arial,sans-serif;">${replaceVars(b.testo||'Clicca qui',vars)}</a></div>`
    }

    if (b.tipo === 'immagine' && b.src)
      return `<div style="text-align:${b.align||'center'};margin:0 0 16px;"><img src="${b.src}" alt="${b.alt||''}" style="max-width:${b.width||'100%'};height:auto;display:inline-block;border-radius:4px;"/></div>`

    if (b.tipo === 'separatore')
      return `<hr style="border:none;border-top:1px solid ${b.color||'#E5E7EB'};margin:20px 0;"/>`

    if (b.tipo === 'citazione') {
      const inner = cleanFontTags(replaceVars(b.html||'',vars))
      const plain = inner.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').trim()
      if (!plain) return ''
      return `<blockquote style="border-left:4px solid ${PRIMARY};margin:16px 0;padding:12px 18px;background:#EEEFFD;color:#4347D0;font-style:italic;border-radius:0 8px 8px 0;font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.7;">${inner}</blockquote>`
    }

    if (b.tipo === 'tabella_contatto') {
      const righe: string[] = b.righe || ['azienda','titolare','telefono','email_contatto','associato','pagante','mestiere_settore','stato']
      const titolo = replaceVars(b.titolo || 'DETTAGLI CONTATTO', vars)
      let borderIdx = 0
      const rows = righe.map(r => {
        const val = vars[r] || ''
        if (!val) return ''
        const border = borderIdx > 0 ? 'border-top:1px solid #E5E7EB;' : ''
        borderIdx++
        let cellContent: string
        if (r === 'stato') {
          cellContent = `<span style="background:${PRIMARY};color:#fff;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;font-family:Inter,Arial,sans-serif;">${val}</span>`
        } else {
          cellContent = val
        }
        return `<tr style="${border}"><td style="padding:8px 16px;font-size:13px;color:#6B7280;font-family:Inter,Arial,sans-serif;width:130px;vertical-align:top;">${RLABELS[r]||r}</td><td style="padding:8px 16px;font-size:14px;font-weight:600;color:#0A0A0A;font-family:Inter,Arial,sans-serif;">${cellContent}</td></tr>`
      }).filter(Boolean).join('')
      if (!rows) return ''
      return `<table style="width:100%;border-collapse:collapse;background:#F9FAFB;border-radius:10px;overflow:hidden;margin:0 0 16px;"><tr><td colspan="2" style="padding:10px 16px 6px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.06em;font-family:Inter,Arial,sans-serif;">${titolo}</td></tr>${rows}</table>`
    }

    if (b.tipo === 'alert') {
      const ac   = b.color     || '#F59E0B'
      const abg  = b.bg        || '#FFF7ED'
      const atc  = b.textColor || '#92400E'
      const at   = replaceVars(b.titolo || '', vars)
      const atxt = replaceVars(b.testo  || '', vars)
      if (!atxt.replace(/<[^>]*>/g,'').trim()) return ''
      return `<div style="border-left:4px solid ${ac};background:${abg};border-radius:0 8px 8px 0;padding:12px 18px;margin:16px 0;">${at ? `<p style="margin:0 0 5px;font-size:11px;font-weight:700;color:${atc};text-transform:uppercase;letter-spacing:.06em;font-family:Inter,Arial,sans-serif;">${at}</p>` : ''}<p style="margin:0;font-size:14px;color:${atc};line-height:1.6;font-family:Inter,Arial,sans-serif;">${atxt}</p></div>`
    }

    return ''
  }).join('\n')
}

function buildFullHtml(bodyHtml: string, logoUrl: string, headerColor = HEADER_DEFAULT, logoH = 44): string {
  const isLight = !headerColor || headerColor === '#ffffff' || headerColor === '#fff' || headerColor.toLowerCase() === '#ffffff'
  const headerStyle = isLight
    ? `background:#ffffff;border-bottom:1px solid #E5E7EB;`
    : `background:${headerColor};`
  const css    = `<style>body,table,td{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}p{margin:0 0 10px;font-family:Inter,Arial,sans-serif;}a{color:inherit;text-decoration:none;}@media only screen and (max-width:620px){.ew{width:100% !important;padding:8px !important}}</style>`
  const header = `<div style="${headerStyle}"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:16px 24px;"><img src="${logoUrl}" alt="CNA Roma" style="height:${logoH}px;display:block;max-width:260px;"/></td></tr></table></div>`
  const footer = `<div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:16px 24px;"><p style="margin:0;font-size:11px;color:#9CA3AF;font-family:Inter,Arial,sans-serif;">CRM CNA Roma &mdash; Confederazione Nazionale dell&rsquo;Artigianato &middot; <a href="mailto:${FROM_EMAIL}" style="color:${PRIMARY}">${FROM_EMAIL}</a></p></div>`
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">${css}</head><body style="margin:0;padding:0;background:#ffffff;"><table class="ew" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;"><tr><td align="center" style="padding:24px 16px;"><table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,.1);"><tr><td>${header}</td></tr><tr><td style="padding:32px;">${bodyHtml}</td></tr><tr><td>${footer}</td></tr></table></td></tr></table></body></html>`
}

// Allegati opzionali per destinatario: [{ filename, content (base64) }] — usati dall'attestato d'iscrizione
function cleanAttachments(a: any): { filename: string, content: string }[] {
  if (!Array.isArray(a)) return []
  return a
    .filter(x => x && typeof x.filename === 'string' && typeof x.content === 'string' && x.content.length > 0)
    .slice(0, 5)
    .map(x => ({ filename: x.filename.slice(0, 120), content: x.content }))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    if (!RESEND_API_KEY)
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY non configurata' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })

    const { oggetto, blocchi, destinatari, logo_url, header_color, logo_height } = await req.json()

    if (!oggetto || !blocchi?.length || !destinatari?.length)
      return new Response(JSON.stringify({ error: 'oggetto, blocchi e destinatari richiesti' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })

    const logoUrl     = logo_url     || LOGO_DEFAULT
    const headerColor = header_color || HEADER_DEFAULT
    const logoH       = parseInt(logo_height || '44') || 44

    let sent = 0
    const errors: string[] = []

    for (const dest of destinatari) {
      if (!dest.operatore_email) { console.warn('Skip: no email', dest.company_name); continue }

      const vars: Record<string,string> = {
        // Campi base (retrocompatibilita')
        nome_azienda:     dest.company_name      || '',
        referente:        dest.contact_name      || '',
        telefono:         dest.contact_phone     || '',
        email_contatto:   dest.contact_email     || '',
        stato:            STATI_LABEL[dest.status] || dest.status || '',
        assegnato_a:      dest.operatore_nome    || '',
        data_creazione:   dest.created_at ? new Date(dest.created_at).toLocaleDateString('it-IT') : '',
        fonte:            dest.source            || '',
        creato_da:        dest.creato_da         || '',
        // Note scritte dagli operatori: protette e con gli a capo mantenuti
        note:             escapeHtml(String(dest.note || '').trim()).replace(/\r?\n/g, '<br>'),
        // Nuovi campi con alias diretti
        azienda:          dest.company_name      || '',
        titolare:         dest.titolare          || dest.contact_name || '',
        associato:        dest.associato         || '',
        pagante:          dest.pagante           || '',
        mestiere_settore: dest.mestiere_settore  || '',
      }

      // L'app disegna l'email con lo stesso motore dell'anteprima: se l'HTML arriva pronto, si spedisce cosi' com'e'.
      // Il rendering interno resta solo come riserva per chiamate senza HTML.
      const prerendered  = typeof dest.html === 'string' && dest.html.length > 0
      const html         = prerendered ? dest.html : buildFullHtml(blocchiToHtml(blocchi, vars), logoUrl, headerColor, logoH)
      const oggettoFinal = (prerendered && typeof dest.subject === 'string' && dest.subject.trim())
        ? dest.subject
        : replaceVars(oggetto, { ...vars, note: String(dest.note || '').replace(/\s+/g,' ').trim() })

      const attachments = cleanAttachments(dest.attachments)

      console.log(`Invio a ${dest.operatore_email} (${dest.company_name || 'n/a'}) ${prerendered ? '[html app]' : '[html server]'}${attachments.length ? ` [${attachments.length} allegati]` : ''}`)

      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [dest.operatore_email],
          reply_to: FROM_EMAIL,
          subject: oggettoFinal,
          html,
          ...(attachments.length ? { attachments } : {})
        })
      })
      const txt = await r.text()
      if (r.ok) { sent++; console.log(`OK: ${dest.operatore_email}`) }
      else { errors.push(`${dest.operatore_email}: ${r.status} ${txt}`); console.error(`FAIL: ${dest.operatore_email}`, txt) }

      await new Promise(res => setTimeout(res, 500))
    }

    return new Response(JSON.stringify({ ok: true, sent, errors, total: destinatari.length }),
      { headers: { ...cors, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('crm-bulk-email error:', String(err))
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
