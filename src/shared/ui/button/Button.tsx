import Link from 'next/link'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'md' | 'sm'

type BaseProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  leftSlot?: ReactNode
}

type ButtonProps = BaseProps & ComponentPropsWithoutRef<'button'>

export function Button ({
  variant = 'primary',
  size = 'md',
  fullWidth,
  leftSlot,
  className,
  children,
  ...props
}: ButtonProps) {
  const buttonClassName = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={buttonClassName} {...props}>
      {leftSlot ? <span className={styles.leftSlot}>{leftSlot}</span> : null}
      {children}
    </button>
  )
}

type ButtonLinkProps = BaseProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, 'className' | 'children'> & {
    className?: string
    children: ReactNode
  }

export function ButtonLink ({
  variant = 'primary',
  size = 'md',
  fullWidth,
  leftSlot,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  const linkClassName = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Link className={linkClassName} {...props}>
      {leftSlot ? <span className={styles.leftSlot}>{leftSlot}</span> : null}
      {children}
    </Link>
  )
}

