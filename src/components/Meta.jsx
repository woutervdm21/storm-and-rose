// Reusable meta/SEO head component — wraps react-helmet-async
import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

const SITE_NAME  = 'Storm & Rose'
const SITE_URL   = 'https://stormandrose.co.za'
const DEFAULT_DESC = 'Luxury candles & thoughtful designs, handcrafted with love. Based in Mpumalanga, South Africa.'
// a photo, not the logo — link previews crop to a wide box and a small
// square mark reads as an empty card
const DEFAULT_IMG  = `${SITE_URL}/images/AboutUsSample.jpg`

export default function Meta({ title, description, image, noIndex = false, type = 'website' }) {
  const { pathname } = useLocation()
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Luxury Handcrafted Candles`
  const desc  = description ?? DEFAULT_DESC
  const img   = image ?? DEFAULT_IMG
  const url   = `${SITE_URL}${pathname}`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noIndex
        ? <meta name="robots" content="noindex, nofollow" />
        : <link rel="canonical" href={url} />}

      {/* Open Graph — controls previews on WhatsApp, Facebook, etc. */}
      <meta property="og:type"        content={type} />
      <meta property="og:site_name"   content={SITE_NAME} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image"       content={img} />
      <meta property="og:url"         content={url} />
      <meta name="twitter:card"       content="summary_large_image" />
    </Helmet>
  )
}
