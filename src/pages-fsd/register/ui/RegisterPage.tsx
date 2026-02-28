import { SignUpForm } from '@/features/sign-up'
import { Container } from '@/shared/ui'
import { LandingHeader } from '@/widgets/landing-header'

import styles from './RegisterPage.module.css'

export function RegisterPage () {
  return (
    <div className={styles.page}>
      <LandingHeader />
      <Container className={styles.container}>
        <div className={styles.card}>
          <SignUpForm />
        </div>
      </Container>
    </div>
  )
}

