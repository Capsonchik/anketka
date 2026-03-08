import { AuditorAuthInit, RequireAuditorAuthNoSSR } from '@/app/providers'

export default function AuditorLayout ({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuditorAuthNoSSR>
      <AuditorAuthInit />
      {children}
    </RequireAuditorAuthNoSSR>
  )
}

