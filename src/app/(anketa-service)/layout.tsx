import type { Metadata } from 'next'

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
  return <AnketaServiceShell>{children}</AnketaServiceShell>
}