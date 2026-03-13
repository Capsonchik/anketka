import type { Metadata } from 'next'

import { RequireAuthNoSSR, RequirePageAccess } from '@/app/providers'
import { BootstrapDataProvider } from '@/shared/lib/bootstrap-data'
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
    <RequireAuthNoSSR>
      <BootstrapDataProvider>
        <RequirePageAccess>
          <AnketaServiceShell>{children}</AnketaServiceShell>
        </RequirePageAccess>
      </BootstrapDataProvider>
    </RequireAuthNoSSR>
  )
}