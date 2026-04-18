// Reusable meta/SEO head component — wraps react-helmet-async
import { Helmet } from 'react-helmet-async'

const SITE_NAME  = 'Storm & Rose'
const SITE_URL   = 'https://stormandrose.co.za'
const DEFAULT_DESC = 'Luxury candles & thoughtful designs, handcrafted with love. Based in Mpumalanga, South Africa.'
const DEFAULT_IMG  = `${SITE_URL}/images/Logo1.png`

export default function Meta({ title, description, image, noIndex = false }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Luxury Handcrafted Candles`
  const desc  = description ?? DEFAULT_DESC
  const img   = image ?? DEFAULT_IMG

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph — controls previews on WhatsApp, Facebook, etc. */}
      <meta property="og:type"        content="website" />
      <meta property="og:site_name"   content={SITE_NAME} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image"       content={img} />
    </Helmet>
  )
}
