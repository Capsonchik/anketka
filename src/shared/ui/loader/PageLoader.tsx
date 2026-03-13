import { Loader as RsuiteLoader } from 'rsuite'

import styles from './PageLoader.module.css'

export function PageLoader ({
  centered = false,
  text,
  size = 'md',
}: {
  centered?: boolean
  text?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}) {
  return (
    <div className={[styles.root, centered ? styles.centered : ''].filter(Boolean).join(' ')}>
      <RsuiteLoader size={size} content={text} />
    </div>
  )
}
