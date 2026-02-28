'use client'

import { useEffect, useMemo, useRef } from 'react'

import styles from './OtpCodeInput.module.css'

type OtpCodeInputProps = {
  value: string
  onChange: (value: string) => void
  length?: number
  isInvalid?: boolean
  autoFocus?: boolean
}

function onlyDigits (value: string) {
  return value.replaceAll(/\D/g, '')
}

export function OtpCodeInput ({
  value,
  onChange,
  length = 6,
  isInvalid,
  autoFocus,
}: OtpCodeInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  const digits = useMemo(() => {
    const normalized = onlyDigits(value).slice(0, length)
    return Array.from({ length }, (_, idx) => normalized[idx] ?? '')
  }, [length, value])

  useEffect(() => {
    if (!autoFocus) return
    const first = inputsRef.current[0]
    first?.focus()
  }, [autoFocus])

  return (
    <div className={styles.wrap}>
      {digits.map((d, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputsRef.current[idx] = el
          }}
          className={styles.cell}
          value={d}
          inputMode="numeric"
          autoComplete={idx === 0 ? 'one-time-code' : 'off'}
          aria-label={`Цифра ${idx + 1}`}
          aria-invalid={isInvalid}
          onChange={(e) => {
            const nextDigit = onlyDigits(e.target.value).slice(-1)
            const nextValueArr = [...digits]
            nextValueArr[idx] = nextDigit
            const nextValue = nextValueArr.join('')
            onChange(nextValue)

            if (nextDigit && idx < length - 1) {
              inputsRef.current[idx + 1]?.focus()
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              if (digits[idx]) {
                const nextValueArr = [...digits]
                nextValueArr[idx] = ''
                onChange(nextValueArr.join(''))
                return
              }

              if (idx > 0) {
                inputsRef.current[idx - 1]?.focus()
                const nextValueArr = [...digits]
                nextValueArr[idx - 1] = ''
                onChange(nextValueArr.join(''))
              }
            }

            if (e.key === 'ArrowLeft' && idx > 0) {
              inputsRef.current[idx - 1]?.focus()
            }

            if (e.key === 'ArrowRight' && idx < length - 1) {
              inputsRef.current[idx + 1]?.focus()
            }
          }}
          onPaste={(e) => {
            e.preventDefault()
            const pasted = onlyDigits(e.clipboardData.getData('text')).slice(0, length)
            if (!pasted) return
            onChange(pasted)
            const focusIndex = Math.min(pasted.length, length - 1)
            inputsRef.current[focusIndex]?.focus()
          }}
        />
      ))}
    </div>
  )
}

