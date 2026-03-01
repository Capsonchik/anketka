'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import type { AuthTokens } from '@/api-config/auth-tokens'
import { writeAuthTokens } from '@/api-config/auth-tokens'
import { Button } from '@/shared/ui'

import { OtpCodeInput } from './OtpCodeInput'
import styles from './SignInForm.module.css'

type Step = 'credentials' | 'twoFactor'

function isValidTwoFactorCode (code: string) {
  return code.replaceAll(/\s/g, '') === '123456'
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

export function SignInForm () {
  const router = useRouter()
  const hasRedirectedRef = useRef(false)

  const [step, setStep] = useState<Step>('credentials')
  const [hasPasswordVisible, setHasPasswordVisible] = useState(false)
  const pendingTokensRef = useRef<AuthTokens | null>(null)

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null)
  const [twoFactorCode, setTwoFactorCode] = useState('')

  const canSubmit = useMemo(() => login.trim().length > 0 && password.length > 0, [login, password])

  const isTwoFactorSubmitDisabled = useMemo(() => twoFactorCode.length !== 6, [twoFactorCode])

  return (
    <div className={styles.viewport} data-step={step}>
      <div className={styles.track}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>Вход</div>
            <div className={styles.panelSubtitle}>Используйте логин или email и пароль</div>
          </div>
          <form
            className={styles.form}
            onSubmit={async (e) => {
              e.preventDefault()
              setError(null)

              if (!canSubmit) {
                setError('Заполните логин (или email) и пароль')
                return
              }

              if (!login.includes('@')) {
                setError('Пока поддерживается только вход по email')
                return
              }

              try {
                const res = await axiosMainRequest.post(apiRoutes.auth.login, {
                  email: login.trim(),
                  password,
                })

                const tokens: AuthTokens | undefined = res?.data?.tokens
                if (!tokens?.accessToken || !tokens?.refreshToken) {
                  setError('Не удалось получить токены. Попробуйте ещё раз.')
                  return
                }

                pendingTokensRef.current = {
                  accessToken: tokens.accessToken,
                  refreshToken: tokens.refreshToken,
                }

                setTwoFactorCode('')
                setTwoFactorError(null)
                hasRedirectedRef.current = false
                setStep('twoFactor')
              } catch (err: unknown) {
                setError(getApiErrorMessage(err))
              }
            }}
          >
            <label className={styles.label}>
              <span className={styles.labelText}>Логин или email</span>
              <input
                className={styles.input}
                name="login"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                autoComplete="username"
                placeholder="admin или user@example.com"
              />
            </label>

            <label className={styles.label}>
              <span className={styles.labelText}>Пароль</span>
              <span className={styles.passwordWrap}>
                <input
                  className={styles.input}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={hasPasswordVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  aria-label={hasPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'}
                  onClick={() => setHasPasswordVisible((v) => !v)}
                >
                  <EyeIcon isOpen={hasPasswordVisible} />
                </button>
              </span>
            </label>

            {error ? <div className={styles.error}>{error}</div> : null}

            <Button type="submit" variant="primary" disabled={!canSubmit} fullWidth>
              Войти
            </Button>
          </form>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>Введите полученный код</div>
            <div className={styles.panelSubtitle}>Мок: 123456</div>
          </div>

          <form
            className={styles.twoFactorForm}
            onSubmit={(e) => {
              e.preventDefault()
              setTwoFactorError(null)

              if (!isValidTwoFactorCode(twoFactorCode)) {
                setTwoFactorError('Неверный код')
                return
              }

              if (hasRedirectedRef.current) return
              hasRedirectedRef.current = true

              if (pendingTokensRef.current) {
                writeAuthTokens(pendingTokensRef.current)
              }
              router.replace('/dashboard')
              router.refresh()
            }}
          >
            <OtpCodeInput
              value={twoFactorCode}
              onChange={(v) => {
                setTwoFactorCode(v)
                if (twoFactorError) setTwoFactorError(null)
              }}
              autoFocus={step === 'twoFactor'}
              isInvalid={Boolean(twoFactorError)}
            />

            {twoFactorError ? <div className={styles.error}>{twoFactorError}</div> : null}

            <div className={styles.twoFactorActions}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  pendingTokensRef.current = null
                  hasRedirectedRef.current = false
                  setTwoFactorCode('')
                  setTwoFactorError(null)
                  setStep('credentials')
                }}
                fullWidth
              >
                Назад
              </Button>
              <Button type="submit" variant="primary" disabled={isTwoFactorSubmitDisabled} fullWidth>
                Подтвердить
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function EyeIcon ({ isOpen }: { isOpen: boolean }) {
  if (isOpen) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M2.4 12s3.6-7 9.6-7 9.6 7 9.6 7-3.6 7-9.6 7S2.4 12 2.4 12z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 5l18 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M2.4 12s3.6-7 9.6-7c2.1 0 3.9.7 5.4 1.7M21.6 12s-1.3 2.5-3.7 4.4c-1.6 1.2-3.6 2.6-5.9 2.6-6 0-9.6-7-9.6-7 0 0 1.2-2.4 3.5-4.3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10.2 10.2a3 3 0 004.2 4.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

