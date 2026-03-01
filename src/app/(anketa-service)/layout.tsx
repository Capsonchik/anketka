import type { Metadata } from 'next'

import { RequireAuth } from '@/app/providers'
import { AnketaServiceShell } from '@/widgets/anketa-service-shell'

export const metadata: Metadata = {
  title: 'Анкетка — сервис',
  description: 'Сервис анкетирования населения',
}

export default function AnketaServiceLayout ({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <RequireAuth>
      <AnketaServiceShell>{children}</AnketaServiceShell>
    </RequireAuth>
  )
}