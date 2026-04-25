import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://compareelite.com'),
  title: {
    default: 'CompareElite | The Most Trusted Buying Guides',
    template: '%s | CompareElite',
  },
  description: 'Unbiased buying guides and product comparisons across Tech, Home, Fitness, and Auto. Find the best products for your budget.',
  openGraph: {
    type: 'website',
    siteName: 'CompareElite',
    title: 'CompareElite | The Most Trusted Buying Guides',
    description: 'Unbiased buying guides and product comparisons across Tech, Home, Fitness, and Auto. Find the best products for your budget.',
    url: 'https://compareelite.com',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'CompareElite' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@CompareElite',
    title: 'CompareElite | The Most Trusted Buying Guides',
    description: 'Unbiased buying guides and product comparisons across Tech, Home, Fitness, and Auto.',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-QEREG8GBQF"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-QEREG8GBQF');
          `}
        </Script>
      </head>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
        {process.env.NODE_ENV === 'production' && <SpeedInsights />}
      </body>
    </html>
  )
}
