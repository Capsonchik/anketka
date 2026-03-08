'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import axiosAuditorRequest from '@/api-config/auditor-api-config'
import { apiRoutes } from '@/api-config/api-routes'
import type { AuditorAuthTokens } from '@/api-config/auditor-auth-tokens'
import { writeAuditorAuthTokens } from '@/api-config/auditor-auth-tokens'
import { Button } from '@/shared/ui'

import styles from './AuditorPortal.module.css'

type AuditorAuthResponse = {
  auditor: { id: string; firstName: string; lastName: string; email: string | null }
  tokens: { accessToken: string; refreshToken: string }
}

function getApiErrorMessage (err: unknown): string {
  if (typeof err === 'object' && err) {
    const response = (err as { response?: unknown }).response
    if (typeof response === 'object' && response) {
      const data = (response as { data?: unknown }).data
      const detail = (data as { detail?: unknown } | undefined)?.detail
      if (typeof detail === 'string' && detail.trim()) return detail
    }
  }

  if (err instanceof Error && err.message) return err.message
  return 'Не удалось войти. Проверьте данные и попробуйте ещё раз.'
}

export function AuditorLoginPage () {
  const router = useRouter()
  const hasRedirectedRef = useRef(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => email.trim().length > 0 && password.length > 0, [email, password])

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div>
          <div className={styles.title}>Вход аудитора</div>
          <div className={styles.subtitle}>Войдите по email и паролю, чтобы увидеть назначенные проверки</div>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setError(null)
            if (!canSubmit) return

            try {
              const res = await axiosAuditorRequest.post<AuditorAuthResponse>(apiRoutes.auditorAuth.login, {
                email: email.trim(),
                password,
              })

              const t = res?.data?.tokens
              const tokens: AuditorAuthTokens | null = t?.accessToken && t?.refreshToken ? { accessToken: t.accessToken, refreshToken: t.refreshToken } : null
              if (!tokens) {
                setError('Не удалось получить токены')
                return
              }

              writeAuditorAuthTokens(tokens)
              if (hasRedirectedRef.current) return
              hasRedirectedRef.current = true
              router.replace('/auditor')
              router.refresh()
            } catch (err: unknown) {
              setError(getApiErrorMessage(err))
            }
          }}
          style={{ display: 'grid', gap: 10 }}
        >
          <label style={{ display: 'grid', gap: 6 }}>
            <span className={styles.subtitle}>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="auditor@example.com"
              autoComplete="username"
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.12)',
                fontWeight: 500,
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span className={styles.subtitle}>Пароль</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.12)',
                fontWeight: 500,
              }}
            />
          </label>

          {error ? <div className={styles.error}>{error}</div> : null}

          <Button type="submit" variant="primary" disabled={!canSubmit} fullWidth>
            Войти
          </Button>
        </form>
      </div>
    </div>
  )
}

