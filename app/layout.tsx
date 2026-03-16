import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Dr. Mkhonza | Staff Portal',
  description: 'Staff portal for Dr. Mkhonza Health Practice. Internal use only.',
  icons: {
    icon: [
      {
        url: '/favicon.jpeg',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/favicon.jpeg',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/favicon.jpeg',
        type: 'image/jpeg',
      },
    ],
    apple: '/favicon.jpeg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}