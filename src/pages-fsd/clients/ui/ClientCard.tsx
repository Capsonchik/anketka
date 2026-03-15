import Image from 'next/image'

import type { ClientItem } from '../model/types'

import styles from './ClientCard.module.css'

type Props = {
  client: ClientItem
  onEdit: () => void
  onToggleArchive: () => void
  onOwners: () => void
}

export function ClientCard ({ client, onEdit, onToggleArchive, onOwners }: Props) {
  const archiveLabel = client.isArchived ? 'Разархивировать' : 'Архивировать'

  return (
    <div className={styles.card}>
      <div className={styles.title}>{client.name}</div>
      <div className={styles.meta}>
        <span>Категория: {client.category || '—'}</span>
        <span>Создан: {fmtDt(client.createdAt)}</span>
        <span>АП: {client.baseApProjectId ? 'загружена' : '—'}</span>
        <span>{client.isArchived ? 'Архив' : 'Активен'}</span>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.iconButton} aria-label="Редактировать" title="Редактировать" onClick={onEdit}>
          <Image src="/icons/edit.svg" alt="" width={16} height={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          aria-label={archiveLabel}
          title={archiveLabel}
          onClick={onToggleArchive}
        >
          <Image src="/icons/archive.svg" alt="" width={16} height={16} aria-hidden="true" />
        </button>
        <button type="button" className={styles.iconButton} aria-label="Владельцы" title="Владельцы" onClick={onOwners}>
          <Image src="/icons/user.svg" alt="" width={16} height={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function fmtDt (value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

