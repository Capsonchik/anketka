import { SignInForm } from '@/features/sign-in'
import { Container } from '@/shared/ui'
import { LandingHeader } from '@/widgets/landing-header'

import styles from './LoginPage.module.css'

export function LoginPage () {
  return (
    <div className={styles.page}>
      <LandingHeader />
      <Container className={styles.container}>
        <div className={styles.card}>
          <SignInForm />
        </div>
      </Container>
    </div>
  )
}

