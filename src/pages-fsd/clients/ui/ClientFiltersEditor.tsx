'use client'

import { useMemo } from 'react'
import { Input, SelectPicker } from 'rsuite'

import { Button } from '@/shared/ui'

import styles from './ClientFiltersEditor.module.css'

export type ClientFilterDef = {
  key: string
  title: string
  type: 'enum' | 'multi_enum' | 'text'
  values?: string[]
}

type PresetKey = 'retail' | 'auto' | 'bank' | 'other'

const typeOptions = [
  { value: 'enum', label: 'Список (1 значение)' },
  { value: 'multi_enum', label: 'Список (несколько)' },
  { value: 'text', label: 'Текст' },
] as const

const presets: Record<PresetKey, ClientFilterDef[]> = {
  retail: [
    { key: 'region', title: 'Регион', type: 'enum' },
    { key: 'city', title: 'Город', type: 'enum' },
    { key: 'format', title: 'Формат', type: 'enum' },
    { key: 'channel', title: 'Канал', type: 'enum' },
    { key: 'cluster', title: 'Кластер', type: 'enum' },
    { key: 'tm', title: 'Территориальный менеджер', type: 'enum' },
    { key: 'sv', title: 'Супервайзер', type: 'enum' },
  ],
  auto: [
    { key: 'region', title: 'Регион', type: 'enum' },
    { key: 'city', title: 'Город', type: 'enum' },
    { key: 'dealer', title: 'Дилер', type: 'enum' },
    { key: 'brand', title: 'Бренд', type: 'enum' },
    { key: 'segment', title: 'Сегмент', type: 'enum' },
    { key: 'tm', title: 'Территориальный менеджер', type: 'enum' },
  ],
  bank: [
    { key: 'region', title: 'Регион', type: 'enum' },
    { key: 'city', title: 'Город', type: 'enum' },
    { key: 'branch', title: 'Филиал', type: 'enum' },
    { key: 'type', title: 'Тип отделения', type: 'enum' },
    { key: 'tm', title: 'Территориальный менеджер', type: 'enum' },
  ],
  other: [
    { key: 'region', title: 'Регион', type: 'enum' },
    { key: 'city', title: 'Город', type: 'enum' },
  ],
}

function slug (value: string) {
  const s = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
  return s || 'param'
}

function uniqKey (base: string, keys: Set<string>) {
  if (!keys.has(base)) return base
  for (let i = 2; i < 2000; i += 1) {
    const k = `${base}_${i}`
    if (!keys.has(k)) return k
  }
  return `${base}_${Date.now()}`
}

export function ClientFiltersEditor ({
  value,
  categoryPreset,
  onChange,
}: {
  value: ClientFilterDef[]
  categoryPreset: PresetKey
  onChange: (next: ClientFilterDef[]) => void
}) {
  const keys = useMemo(() => new Set(value.map((x) => x.key)), [value])

  return (
    <div className={styles.wrap}>
      <div className={styles.hint}>
        Фильтры — это пользовательские параметры для сегментации данных клиента в отчётах и таблицах (обычно совпадают с колонками АП): например
        <span className={styles.mono}> регион</span>, <span className={styles.mono}> формат</span>, <span className={styles.mono}> кластер</span>.
      </div>

      <div className={styles.actions}>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const nextKeys = new Set(value.map((x) => x.key))
            const add = presets[categoryPreset].map((p) => ({ ...p, key: uniqKey(p.key, nextKeys) }))
            onChange([...value, ...add])
          }}
        >
          Добавить пресет
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            onChange([])
          }}
        >
          Очистить
        </Button>
        <div className={styles.valuesHint}>Значения подтягиваются из АП автоматически.</div>
      </div>

      <div className={styles.grid}>
        <div className={[styles.row, styles.head].join(' ')}>
          <div>Название</div>
          <div>Ключ</div>
          <div>Тип</div>
          <div />
        </div>

        {value.map((f, idx) => {
          return (
            <div key={`${f.key}-${idx}`} className={styles.row}>
              <Input
                value={f.title}
                onChange={(v) => {
                  const title = String(v ?? '')
                  onChange(value.map((x, i) => (i === idx ? { ...x, title } : x)))
                }}
                placeholder="Например, Формат"
              />
              <Input
                value={f.key}
                onChange={(v) => {
                  const next = String(v ?? '')
                  onChange(value.map((x, i) => (i === idx ? { ...x, key: next } : x)))
                }}
                onBlur={() => {
                  const next = slug(f.key)
                  const nextKey = next && next !== f.key ? uniqKey(next, new Set([...keys].filter((k) => k !== f.key))) : f.key
                  onChange(value.map((x, i) => (i === idx ? { ...x, key: nextKey } : x)))
                }}
                placeholder="format"
              />
              <SelectPicker
                value={f.type}
                onChange={(v) => {
                  const type = ((v as ClientFilterDef['type']) ?? 'enum')
                  onChange(value.map((x, i) => (i === idx ? { ...x, type } : x)))
                }}
                data={[...typeOptions]}
                cleanable={false}
                searchable={false}
                block
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onChange(value.filter((_, i) => i !== idx))
                }}
              >
                Удалить
              </Button>
            </div>
          )
        })}

        {!value.length ? <div className={styles.hint}>Фильтры не заданы — можно пропустить.</div> : null}
      </div>
    </div>
  )
}

