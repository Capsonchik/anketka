'use client'

import dynamic from 'next/dynamic'

const RequireAuth = dynamic(() => import('./RequireAuth').then((m) => m.RequireAuth), {
  ssr: false,
})

export function RequireAuthNoSSR ({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>
}

