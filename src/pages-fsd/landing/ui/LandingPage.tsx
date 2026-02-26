import { CookieConsentBanner } from '@/features/cookie-consent'
import { LandingFooter } from '@/widgets/landing-footer'
import { LandingHero } from '@/widgets/landing-hero'
import { LandingHeader } from '@/widgets/landing-header'
import { LandingManage } from '@/widgets/landing-manage'
import { LandingProjectVariants } from '@/widgets/landing-project-variants'
import { LandingTariffs } from '@/widgets/landing-tariffs'
import { LandingTestimonials } from '@/widgets/landing-testimonials'

import styles from './LandingPage.module.css'

export function LandingPage () {
  return (
    <div className={styles.page}>
      <LandingHeader />
      <main className={styles.main}>
        <LandingHero />
        <LandingProjectVariants />
        <LandingManage />
        <LandingTestimonials />
        <LandingTariffs />
      </main>
      <LandingFooter />
      <CookieConsentBanner />
    </div>
  )
}

