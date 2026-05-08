/**
 * Matkahuolto XML API v2.0 — Aktivointikoodi-integraatio
 *
 * Test endpoint:  https://mhhkiweb1.matkahuolto.fi/scripts101c/mhshipmentxmltesti.wsc/ovtinxml
 * Prod endpoint:  set MATKAHUOLTO_API_URL (pyydä Matkahuollolta: verkkokauppapalvelut@matkahuolto.fi)
 *
 * ShipmentType A = paperless, ei tarraa — rajapinta palauttaa 7-numeroisen aktivointikoodin.
 * Myyjä kirjoittaa koodin pakettiin ja vie lähimpään Matkahuolto-pisteeseen.
 */

const TEST_ENDPOINT =
  'https://extservicestest.matkahuolto.fi/mpaketti/mhshipmentxml'

const PROD_ENDPOINT =
  'https://extservices.matkahuolto.fi/mpaketti/mhshipmentxml'

export interface MatkahuoltoShipmentParams {
  // Myyjä (lähettäjä)
  senderName: string
  senderAddress: string
  senderPostal: string
  senderCity: string
  senderPhone: string
  senderEmail: string
  // Ostaja (vastaanottaja)
  receiverName: string
  receiverAddress: string
  receiverPostal: string
  receiverCity: string
  receiverPhone: string
  receiverEmail: string
  // Paketti
  weightKg: number
  // Viite (valinnainen, esim. tilausnumero)
  senderReference?: string
}

export interface MatkahuoltoResult {
  success: boolean
  /** 7-numeroinen aktivointikoodi myyjälle */
  activationCode?: string
  /** Lähetysnumero seurantaa varten */
  trackingNumber?: string
  error?: string
  rawResponse?: string
}

// ── Apufunktiot ──────────────────────────────────────────────────────────────

function escapeXml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Normalisoi puhelinnumero Matkahuollon formaattiin (358XXXXXXXXX).
 * Hyväksyy +358XXXXXXXX, 358XXXXXXXX, 0XXXXXXXX tai +46XXXXXXXX jne.
 */
export function normalizePhone(raw: string): string {
  let p = (raw || '').replace(/[\s\-\(\)]/g, '')
  if (p.startsWith('+')) p = p.slice(1)
  if (p.startsWith('00')) p = p.slice(2)
  // Suomalaiset numerot: 0XXXXXXXX → 358XXXXXXXX
  if (p.startsWith('0') && !p.startsWith('358')) {
    p = '358' + p.slice(1)
  }
  return p
}

/** Palauttaa tämän päivän DD.MM.YYYY */
function todayFinnish(): string {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

function parseXmlTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
  const m = xml.match(re)
  return m ? m[1].trim() : ''
}

// ── XML-rakenne ──────────────────────────────────────────────────────────────

function buildShipmentXml(
  params: MatkahuoltoShipmentParams,
  userId: string,
  password: string,
  testMode: boolean,
): string {
  const weight = Math.max(1, Math.ceil(params.weightKg))
  const ref = escapeXml(params.senderReference || '')

  return `<?xml version="1.0" encoding="UTF-8"?>
<MHShipmentRequest>
  <UserId>${userId}</UserId>
  <Password>${password}</Password>
  <Version>2.0</Version>
  <Shipment>
    <ShipmentType>A</ShipmentType>
    <MessageType>N</MessageType>
    <ShipmentDate>${todayFinnish()}</ShipmentDate>
    <Weight>${weight}</Weight>
    <Packages>1</Packages>
    <SenderName1>${escapeXml(params.senderName)}</SenderName1>
    <SenderAddress>${escapeXml(params.senderAddress)}</SenderAddress>
    <SenderPostal>${params.senderPostal.replace(/\s/g, '')}</SenderPostal>
    <SenderCity>${escapeXml(params.senderCity)}</SenderCity>
    <SenderContactNumber>${normalizePhone(params.senderPhone)}</SenderContactNumber>
    <SenderEmail>${params.senderEmail}</SenderEmail>
    <SenderReference>${ref}</SenderReference>
    <ReceiverName1>${escapeXml(params.receiverName)}</ReceiverName1>
    <ReceiverAddress>${escapeXml(params.receiverAddress)}</ReceiverAddress>
    <ReceiverPostal>${params.receiverPostal.replace(/\s/g, '')}</ReceiverPostal>
    <ReceiverCity>${escapeXml(params.receiverCity)}</ReceiverCity>
    <ReceiverContactNumber>${normalizePhone(params.receiverPhone)}</ReceiverContactNumber>
    <ReceiverEmail>${params.receiverEmail}</ReceiverEmail>
    <PayerCode>O</PayerCode>
    <PayerId>${userId}</PayerId>
    <ProductCode>${testMode ? '84' : '80'}</ProductCode>
    <VAKDescription/>
    <DocumentType>NO</DocumentType>
    <ShipmentRow>
      <PackageId/>
      <Weight>${weight}</Weight>
      <Volume/>
      <Width/>
      <Height/>
      <Length/>
    </ShipmentRow>
  </Shipment>
</MHShipmentRequest>`
}

// ── Pääfunktio ───────────────────────────────────────────────────────────────

export async function createMatkahuoltoShipment(
  params: MatkahuoltoShipmentParams,
): Promise<MatkahuoltoResult> {
  // Käytetään testikredentiaaleja jos MATKAHUOLTO_TEST_MODE=true
  // tai jos tuotanto-URL puuttuu
  const testMode =
    process.env.MATKAHUOLTO_TEST_MODE === 'true'

  const endpoint = testMode
    ? TEST_ENDPOINT
    : (process.env.MATKAHUOLTO_API_URL || PROD_ENDPOINT)

  const userId = testMode
    ? (process.env.MATKAHUOLTO_TEST_USER_ID || '9430023')
    : (process.env.MATKAHUOLTO_USER_ID || '15500710')

  const password = testMode
    ? (process.env.MATKAHUOLTO_TEST_PASSWORD || '456')
    : (process.env.MATKAHUOLTO_PASSWORD || '')

  console.log('Matkahuolto config:', {
    testMode,
    endpoint,
    userId,
    passwordSet: !!password,
  })

  const xml = buildShipmentXml(params, userId, password, testMode)

  let responseText = ''
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=UTF-8' },
      body: xml,
      // 15s timeout — avoid blocking webhook too long
      signal: AbortSignal.timeout(15_000),
    })
    responseText = await res.text()
  } catch (err) {
    return {
      success: false,
      error: `Network error: ${String(err)}`,
    }
  }

  console.log('Matkahuolto raw response:', responseText.slice(0, 500))

  // Virhevastaus
  const errorNbr = parseXmlTag(responseText, 'ErrorNbr')
  const errorMsg = parseXmlTag(responseText, 'ErrorMsg')
  if (errorNbr && errorNbr !== '0') {
    return {
      success: false,
      error: `Matkahuolto virhe ${errorNbr}: ${errorMsg}`,
      rawResponse: responseText,
    }
  }

  // Onnistunut vastaus
  // Version 2.0: aktivointikoodi palautuu <ActivationCode> tai <ShipmentNumber>
  const activationCode =
    parseXmlTag(responseText, 'ActivationCode') ||
    parseXmlTag(responseText, 'ShipmentNumber')

  const trackingNumber = parseXmlTag(responseText, 'ShipmentNumber')

  if (!activationCode) {
    return {
      success: false,
      error: 'Aktivointikoodia ei löydy vastauksesta',
      rawResponse: responseText.slice(0, 1000),
    }
  }

  return {
    success: true,
    activationCode,
    trackingNumber: trackingNumber || undefined,
    rawResponse: responseText,
  }
}
