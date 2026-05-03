import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'المجمع الصيني للاكسسوارات',
  description: 'متجر الجملة لإكسسوارات الهواتف المحمولة - بغداد، العراق',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#00ff88" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="المجمع الصيني" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/logo.svg" />
      </head>
      <body className="min-h-screen flex flex-col" style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
