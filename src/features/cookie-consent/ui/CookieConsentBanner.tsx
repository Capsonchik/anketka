'use client'

import { useMemo, useState } from 'react'

import { Button, Container } from '@/shared/ui'

import styles from './CookieConsentBanner.module.css'

type ConsentState = 'unknown' | 'accepted'

const storageKey = 'anketka_cookie_consent'

function readConsent (): ConsentState {
  try {
    const value = window.localStorage.getItem(storageKey)
    return value === 'accepted' ? 'accepted' : 'unknown'
  } catch {
    return 'unknown'
  }
}

function writeAccepted () {
  try {
    window.localStorage.setItem(storageKey, 'accepted')
  } catch {
    // ignore
  }

  try {
    const maxAge = 60 * 60 * 24 * 365
    document.cookie = `${storageKey}=accepted; path=/; max-age=${maxAge}; samesite=lax`
  } catch {
    // ignore
  }
}

export function CookieConsentBanner () {
  const [consent, setConsent] = useState<ConsentState>(() => readConsent())
  const isVisible = useMemo(() => consent !== 'accepted', [consent])

  if (!isVisible) return null

  return (
    <div className={styles.wrap} role="region" aria-label="Уведомление о cookies">
      <Container className={styles.container}>
        <div className={styles.card}>
          <div className={styles.text}>
            <div className={styles.title}>Мы используем cookies</div>
            <div className={styles.subtitle}>
              Они нужны для улучшения опыта, аналитики и персонализации. Продолжая использование,
              вы соглашаетесь с политикой.
            </div>
          </div>
          <div className={styles.actions}>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                writeAccepted()
                setConsent('accepted')
              }}
            >
              Согласен
            </Button>
          </div>
        </div>
      </Container>
    </div>
  )
}

