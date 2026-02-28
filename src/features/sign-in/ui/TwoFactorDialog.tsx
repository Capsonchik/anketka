'use client'

import { useEffect, useId, useMemo, useRef } from 'react'

import { Button } from '@/shared/ui'

import styles from './TwoFactorDialog.module.css'

type TwoFactorDialogProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: (code: string) => void
  error?: string
}

export function TwoFactorDialog ({ isOpen, onClose, onConfirm, error }: TwoFactorDialogProps) {
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const id = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(id)
  }, [isOpen])

  const helperText = useMemo(() => 'Пока мок: код 123456', [])

  if (!isOpen) return null

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.title} id={titleId}>
          Подтверждение (2FA)
        </div>
        <div className={styles.subtitle}>Введите код из приложения/смс</div>

        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const code = String(formData.get('code') ?? '')
            onConfirm(code)
          }}
        >
          <label className={styles.label}>
            <span className={styles.labelText}>Код</span>
            <input
              ref={inputRef}
              className={styles.input}
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              maxLength={6}
              aria-invalid={Boolean(error)}
            />
          </label>

          <div className={styles.hint}>{helperText}</div>
          {error ? <div className={styles.error}>{error}</div> : null}

          <div className={styles.actions}>
            <Button type="button" variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" variant="primary">
              Подтвердить
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

