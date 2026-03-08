'use client'

import dynamic from 'next/dynamic'

const RequireAuditorAuth = dynamic(() => import('./RequireAuditorAuth').then((m) => m.RequireAuditorAuth), {
  ssr: false,
})

export function RequireAuditorAuthNoSSR ({ children }: { children: React.ReactNode }) {
  return <RequireAuditorAuth>{children}</RequireAuditorAuth>
}

