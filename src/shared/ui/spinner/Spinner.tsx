import styles from './Spinner.module.css'

export function Spinner ({
  size = 16,
  thickness = 2,
  className,
}: {
  size?: number
  thickness?: number
  className?: string
}) {
  const combinedClassName = [styles.spinner, className ?? ''].filter(Boolean).join(' ')

  return <span className={combinedClassName} style={{ ['--size' as never]: `${size}px`, ['--thickness' as never]: `${thickness}px` }} aria-hidden="true" />
}

