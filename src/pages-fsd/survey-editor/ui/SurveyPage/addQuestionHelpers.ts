export const CREATE_NEW_SECTION_VALUE = '__create_new_section__'
export const COMMENT_MODE_OPTION = 'option'
export const COMMENT_MODE_FREE = 'free'
export const SIMPLE_TYPES = new Set(['short_text', 'long_text', 'number', 'time', 'date'])
export const CHOICE_TYPES = new Set(['single_choice', 'multi_choice'])

export type AddQuestionOptionDraft = {
  id: string
  label: string
  value: string
  points: string
}

export function createEmptyOptionDraft (index: number, label = ''): AddQuestionOptionDraft {
  return {
    id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${index}`,
    label,
    value: label ? buildOptionValue(label, index) : '',
    points: '',
  }
}

export function normalizeOptionLabel (value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function getBulkOptionValues (raw: string) {
  return raw
    .split(/[\n;]+/g)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function getBulkAddPreviewCount (raw: string, existing: AddQuestionOptionDraft[]) {
  const candidates = getBulkOptionValues(raw)
  if (!candidates.length) return 0
  const known = new Set(existing.map((opt) => normalizeOptionLabel(opt.label)))
  let count = 0
  for (const item of candidates) {
    const normalized = normalizeOptionLabel(item)
    if (!normalized || known.has(normalized)) continue
    known.add(normalized)
    count += 1
  }
  return count
}

export function buildOptionValue (label: string, index: number) {
  const normalized = label
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
  return normalized || `option_${index}`
}

export function getChoiceQuestionWeight (type: string, options: AddQuestionOptionDraft[]) {
  const points = options.map((opt) => {
    const raw = opt.points.trim()
    if (!raw) return 0
    const parsed = Number(raw.replace(',', '.'))
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  })
  if (type === 'single_choice') {
    return points.length ? Math.max(...points) : 0
  }
  return points.reduce((acc, item) => acc + item, 0)
}

export function getQuestionTypeHint (type: string) {
  if (type === 'short_text') return 'Короткий текст: однострочное поле для краткого ответа.'
  if (type === 'long_text') return 'Длинный текст: многострочное поле для развернутого ответа.'
  if (type === 'number') return 'Число: ответ будет вводиться числом.'
  if (type === 'time') return 'Время: ответ в формате времени.'
  if (type === 'date') return 'Дата: ответ в формате даты.'
  if (type === 'single_choice') return 'Одиночный выбор: выберите один вариант, для каждого варианта можно задать вес.'
  if (type === 'multi_choice') return 'Множественный выбор: можно выбрать несколько вариантов, у каждого свой вес.'
  return 'Выбранный тип пока без дополнительной подсказки.'
}

export function getQuestionTypePlaceholder (type: string) {
  if (type === 'short_text') return 'Введите короткий ответ'
  if (type === 'long_text') return 'Введите подробный ответ'
  if (type === 'number') return 'Например: 10'
  if (type === 'time') return 'Например: 14:30'
  if (type === 'date') return 'Например: 31.12.2026'
  return 'Введите значение'
}
