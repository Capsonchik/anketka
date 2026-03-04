import type { Metadata } from 'next'
import { CustomProvider } from 'rsuite'

import { AuthInit } from '@/app/providers'
import  ruRU  from 'rsuite/locales/ru_RU'

import 'rsuite/dist/rsuite-no-reset.min.css'
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
        <CustomProvider locale={ruRU}>
          <AuthInit />
          {children}
        </CustomProvider>
        
      </body>
    </html>
  )
}
