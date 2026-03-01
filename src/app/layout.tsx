import type { Metadata } from 'next'

import { AuthInit } from '@/app/providers'

import './globals.css'

export const metadata: Metadata = {
  title: 'АНКЕТКА',
  description: 'Сервис анкетирования населения',
}

export default function RootLayout ({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru">
      <body>
        <AuthInit />
        {children}
      </body>
    </html>
  )
}
