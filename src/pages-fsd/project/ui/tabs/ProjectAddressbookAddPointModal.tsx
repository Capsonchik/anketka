import { useMemo, useState } from 'react'
import { Button, Input, Modal, SelectPicker } from 'rsuite'

import type { AddressbookPointCreateRequest, RefCityItem, RefRegionItem } from '../../model/types'

export function ProjectAddressbookAddPointModal ({
  open,
  onClose,
  isSubmitting,
  onSubmit,
  initialChainName,
  regions,
  cities,
}: {
  open: boolean
  onClose: () => void
  isSubmitting: boolean
  onSubmit: (payload: AddressbookPointCreateRequest) => void
  initialChainName?: string
  regions: RefRegionItem[]
  cities: RefCityItem[]
}) {
  const [code, setCode] = useState('')
  const [chainName, setChainName] = useState(initialChainName ?? '')
  const [address, setAddress] = useState('')
  const [regionCode, setRegionCode] = useState<string | null>(null)
  const [cityId, setCityId] = useState<number | null>(null)

  const canSubmit = useMemo(() => {
    return chainName.trim().length > 0 && address.trim().length > 0 && !isSubmitting
  }, [address, chainName, isSubmitting])

  const regionOptions = useMemo(() => {
    return (regions ?? []).map((r) => ({ value: r.code, label: r.name }))
  }, [regions])

  const cityOptions = useMemo(() => {
    const list = regionCode ? (cities ?? []).filter((c) => c.regionCode === regionCode) : (cities ?? [])
    return list.map((c) => ({ value: c.id, label: regionCode ? c.name : `${c.name} · ${c.regionCode}` }))
  }, [cities, regionCode])

  const selectedCity = useMemo(() => {
    if (!cityId) return null
    return (cities ?? []).find((c) => c.id === cityId) ?? null
  }, [cities, cityId])

  return (
    <Modal open={open} onClose={onClose} size="md">
      <Modal.Header>
        <Modal.Title>Добавить точку</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div style={{ display: 'grid', gap: 12 }}>
          <Field label="Код точки (опционально)">
            <Input value={code} onChange={(v) => setCode(String(v ?? ''))} placeholder="Например: 000123" />
          </Field>

          <Field label="Сеть *">
            <Input value={chainName} onChange={(v) => setChainName(String(v ?? ''))} placeholder="Например: ПОДРУЖКА" />
          </Field>

          <Field label="Адрес *">
            <Input value={address} onChange={(v) => setAddress(String(v ?? ''))} placeholder="Например: ул. Ленина, 10" />
          </Field>

          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Регион (опционально)">
              <SelectPicker
                value={regionCode}
                onChange={(v) => {
                  setRegionCode((v as string | null) ?? null)
                  setCityId(null)
                }}
                cleanable
                searchable
                block
                data={regionOptions}
                placeholder="Выберите регион"
              />
            </Field>
            <Field label="Город (опционально)">
              <SelectPicker
                value={cityId}
                onChange={(v) => setCityId((v as number | null) ?? null)}
                cleanable
                searchable
                block
                data={cityOptions}
                placeholder={regionCode ? 'Выберите город' : 'Выберите город (или укажите регион)'}
              />
            </Field>
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8 }}>
            Можно выбрать только регион или только город. Если выбран город — регион проставится автоматически.
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button appearance="subtle" onClick={onClose} disabled={isSubmitting}>
          Отмена
        </Button>
        <Button
          appearance="primary"
          onClick={() => onSubmit({
            code: code.trim() || null,
            chainName: chainName.trim(),
            address: address.trim(),
            city: selectedCity?.name ?? null,
            region: selectedCity?.regionCode ?? regionCode ?? null,
          })}
          disabled={!canSubmit}
        >
          Добавить
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

function Field ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      {children}
    </div>
  )
}

