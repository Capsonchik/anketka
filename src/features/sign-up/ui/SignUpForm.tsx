'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'

import axiosMainRequest from '@/api-config/api-config'
import { apiRoutes } from '@/api-config/api-routes'
import { Button } from '@/shared/ui'

import styles from './SignUpForm.module.css'

type FormValues = {
  firstName: string
  lastName: string
  organization?: string
  email: string
  phone: string
  password: string
  passwordConfirm: string
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
  return 'Не удалось зарегистрироваться. Попробуйте ещё раз.'
}

function normalizePhone (value: string) {
  return value.replaceAll(/[^\d+]/g, '')
}

function getPhoneDigitsCount (value: string) {
  return value.replaceAll(/\D/g, '').length
}

export function SignUpForm () {
  const router = useRouter()

  const [hasPasswordVisible, setHasPasswordVisible] = useState(false)
  const [hasPasswordConfirmVisible, setHasPasswordConfirmVisible] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    mode: 'onTouched',
    defaultValues: {
      firstName: '',
      lastName: '',
      organization: '',
      email: '',
      phone: '',
      password: '',
      passwordConfirm: '',
    },
  })

  const password = watch('password')

  const canSubmit = useMemo(() => !isSubmitting, [isSubmitting])

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.title}>Регистрация</div>
        <div className={styles.subtitle}>
          Поля со звёздочкой обязательны. После регистрации вы попадёте на страницу входа.
        </div>
      </div>

      <form
        className={styles.form}
        onSubmit={handleSubmit(async (values) => {
          setSubmitError(null)

          try {
            await axiosMainRequest.post(apiRoutes.auth.register, {
              firstName: values.firstName,
              lastName: values.lastName,
              organization: values.organization || null,
              email: values.email,
              phone: values.phone,
              password: values.password,
            })

            router.replace('/login')
            router.refresh()
          } catch (err: unknown) {
            setSubmitError(getApiErrorMessage(err))
          }
        })}
      >
        <div className={styles.grid}>
          <Field
            label="Имя"
            requiredMark
            error={errors.firstName?.message}
            input={
              <input
                className={styles.input}
                autoComplete="given-name"
                placeholder="Иван"
                {...register('firstName', { required: 'Введите имя' })}
              />
            }
          />

          <Field
            label="Фамилия"
            requiredMark
            error={errors.lastName?.message}
            input={
              <input
                className={styles.input}
                autoComplete="family-name"
                placeholder="Иванов"
                {...register('lastName', { required: 'Введите фамилию' })}
              />
            }
          />

          <Field
            label="Организация"
            error={errors.organization?.message}
            input={
              <input
                className={styles.input}
                autoComplete="organization"
                placeholder="ООО «Компания»"
                {...register('organization')}
              />
            }
          />

          <Field
            label="Почта"
            requiredMark
            error={errors.email?.message}
            input={
              <input
                className={styles.input}
                type="email"
                autoComplete="email"
                placeholder="user@example.com"
                {...register('email', {
                  required: 'Введите email',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Некорректный email',
                  },
                })}
              />
            }
          />

          <Field
            label="Телефон"
            requiredMark
            error={errors.phone?.message}
            input={
              <input
                className={styles.input}
                type="tel"
                autoComplete="tel"
                placeholder="+7 900 000-00-00"
                {...register('phone', {
                  required: 'Введите телефон',
                  validate: (v) => (getPhoneDigitsCount(v) >= 10 ? true : 'Некорректный телефон'),
                  onChange: (e) => {
                    const value = String(e.target.value ?? '')
                    setValue('phone', normalizePhone(value), { shouldValidate: true, shouldTouch: true })
                  },
                })}
              />
            }
          />

          <Field
            label="Пароль"
            requiredMark
            error={errors.password?.message}
            input={
              <span className={styles.passwordWrap}>
                <input
                  className={styles.input}
                  type={hasPasswordVisible ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register('password', {
                    required: 'Введите пароль',
                    minLength: { value: 6, message: 'Минимум 6 символов' },
                  })}
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
            }
          />

          <Field
            label="Подтвердите пароль"
            requiredMark
            error={errors.passwordConfirm?.message}
            input={
              <span className={styles.passwordWrap}>
                <input
                  className={styles.input}
                  type={hasPasswordConfirmVisible ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register('passwordConfirm', {
                    required: 'Подтвердите пароль',
                    validate: (v) => (v === password ? true : 'Пароли не совпадают'),
                  })}
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  aria-label={hasPasswordConfirmVisible ? 'Скрыть пароль' : 'Показать пароль'}
                  onClick={() => setHasPasswordConfirmVisible((v) => !v)}
                >
                  <EyeIcon isOpen={hasPasswordConfirmVisible} />
                </button>
              </span>
            }
          />
        </div>

        {submitError ? <div className={styles.error}>{submitError}</div> : null}

        <Button type="submit" variant="primary" disabled={!canSubmit} fullWidth>
          Создать аккаунт
        </Button>
      </form>
    </div>
  )
}

function Field ({
  label,
  requiredMark,
  error,
  input,
}: {
  label: string
  requiredMark?: boolean
  error?: string
  input: React.ReactNode
}) {
  return (
    <label className={styles.field}>
      <span className={styles.labelRow}>
        <span className={styles.labelText}>{label}</span>
        {requiredMark ? <span className={styles.requiredMark}>*</span> : null}
      </span>
      {input}
      {error ? <span className={styles.error}>{error}</span> : null}
    </label>
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
      <path d="M3 5l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

