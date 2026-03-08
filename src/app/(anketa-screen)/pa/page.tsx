import { Suspense } from 'react'

import { PaPage } from '@/pages-fsd/pa'

export default function Page () {
  return (
    <Suspense fallback={null}>
      <PaPage />
    </Suspense>
  )
}
