'use client'

import { CheckPicker, Checkbox, Input, Modal, SelectPicker } from 'rsuite'

import styles from '../SurveyPage.module.css'
import {
  CHOICE_TYPES,
  COMMENT_MODE_FREE,
  COMMENT_MODE_OPTION,
  CREATE_NEW_SECTION_VALUE,
  SIMPLE_TYPES,
  type AddQuestionOptionDraft,
  getChoiceQuestionWeight,
  getQuestionTypeHint,
  getQuestionTypePlaceholder,
} from './addQuestionHelpers'

type AddQuestionModalProps = {
  open: boolean
  isAdding: boolean
  error: string | null
  builderPages: Array<{ id: string; title: string }>
  pageId: string
  newSectionTitle: string
  code: string
  title: string
  description: string
  questionType: string
  placeholder: string
  weight: string
  options: AddQuestionOptionDraft[]
  optionInput: string
  bulkOptions: string
  bulkOptionPreviewCount: number
  exclusiveOptionIds: string[]
  commentOptionIds: string[]
  required: boolean
  allowNa: boolean
  allowComment: boolean
  commentMode: string
  onClose: () => void
  onSubmit: () => void
  onPageChange: (value: string) => void
  onNewSectionTitleChange: (value: string) => void
  onCodeChange: (value: string) => void
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onQuestionTypeChange: (value: string) => void
  onPlaceholderChange: (value: string) => void
  onWeightChange: (value: string) => void
  onOptionInputChange: (value: string) => void
  onOptionInputEnter: () => void
  onBulkOptionsChange: (value: string) => void
  onBulkOptionsAdd: () => void
  onOptionRemove: (id: string) => void
  onOptionPointsChange: (id: string, points: string) => void
  onExclusiveOptionIdsChange: (ids: string[]) => void
  onCommentOptionIdsChange: (ids: string[]) => void
  onRequiredChange: (value: boolean) => void
  onAllowNaChange: (value: boolean) => void
  onAllowCommentChange: (value: boolean) => void
  onCommentModeChange: (value: string) => void
}

export function AddQuestionModal ({
  open,
  isAdding,
  error,
  builderPages,
  pageId,
  newSectionTitle,
  code,
  title,
  description,
  questionType,
  placeholder,
  weight,
  options,
  optionInput,
  bulkOptions,
  bulkOptionPreviewCount,
  exclusiveOptionIds,
  commentOptionIds,
  required,
  allowNa,
  allowComment,
  commentMode,
  onClose,
  onSubmit,
  onPageChange,
  onNewSectionTitleChange,
  onCodeChange,
  onTitleChange,
  onDescriptionChange,
  onQuestionTypeChange,
  onPlaceholderChange,
  onWeightChange,
  onOptionInputChange,
  onOptionInputEnter,
  onBulkOptionsChange,
  onBulkOptionsAdd,
  onOptionRemove,
  onOptionPointsChange,
  onExclusiveOptionIdsChange,
  onCommentOptionIdsChange,
  onRequiredChange,
  onAllowNaChange,
  onAllowCommentChange,
  onCommentModeChange,
}: AddQuestionModalProps) {
  return (
    <Modal open={open} onClose={() => !isAdding && onClose()} size="lg">
      <Modal.Header>
        <Modal.Title>Добавить вопрос</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className={styles.modalForm}>
          <div className={styles.modalBlock}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Клиентский код вопроса *</div>
              <Input value={code} onChange={(v) => onCodeChange(String(v ?? ''))} placeholder="Например: clientQ1" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Формулировка *</div>
              <Input value={title} onChange={(v) => onTitleChange(String(v ?? ''))} placeholder="Текст вопроса" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Описание вопроса</div>
              <Input value={description} onChange={(v) => onDescriptionChange(String(v ?? ''))} placeholder="Подсказка или пояснение" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Секция</div>
              <SelectPicker
                value={pageId}
                onChange={(v) => onPageChange(String(v ?? ''))}
                data={[
                  ...builderPages.map((p) => ({ value: p.id, label: p.title })),
                  { value: CREATE_NEW_SECTION_VALUE, label: '+ Новая секция' },
                ]}
                cleanable={false}
                searchable={false}
                block
              />
            </div>
            {pageId === CREATE_NEW_SECTION_VALUE && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Название новой секции *</div>
                <Input value={newSectionTitle} onChange={(v) => onNewSectionTitleChange(String(v ?? ''))} placeholder="Например: Секция 1" />
              </div>
            )}
          </div>

          <div className={styles.modalBlock}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Тип вопроса *</div>
              <SelectPicker
                value={questionType}
                onChange={(v) => onQuestionTypeChange(String(v ?? 'short_text'))}
                data={[
                  { value: 'short_text', label: 'Короткий текст' },
                  { value: 'long_text', label: 'Длинный текст' },
                  { value: 'number', label: 'Число' },
                  { value: 'email', label: 'Email' },
                  { value: 'single_choice', label: 'Одиночный выбор' },
                  { value: 'multi_choice', label: 'Множественный выбор' },
                  { value: 'scale', label: 'Шкала' },
                  { value: 'matrix', label: 'Табличный' },
                  { value: 'date', label: 'Дата' },
                  { value: 'time', label: 'Время' },
                  { value: 'rank', label: 'Ранг' },
                  { value: 'photo', label: 'Фото' },
                ]}
                cleanable={false}
                searchable={false}
                block
              />
            </div>
            <div className={styles.hint}>{getQuestionTypeHint(questionType)}</div>
            {SIMPLE_TYPES.has(questionType) && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Плейсхолдер</div>
                <Input value={placeholder} onChange={(v) => onPlaceholderChange(String(v ?? ''))} placeholder={getQuestionTypePlaceholder(questionType)} />
              </div>
            )}

            {CHOICE_TYPES.has(questionType) && (
              <div className={styles.modalInnerBlock}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>Введите вариант и нажмите Enter</div>
                <Input
                  value={optionInput}
                  onChange={(v) => onOptionInputChange(String(v ?? ''))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      onOptionInputEnter()
                    }
                  }}
                  placeholder="Например: Да"
                />
                {options.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onOptionRemove(opt.id)}
                        style={{
                          border: '1px solid rgba(0, 0, 0, 0.12)',
                          borderRadius: 12,
                          padding: '2px 8px',
                          background: 'rgba(255,255,255,0.9)',
                          cursor: 'pointer',
                        }}
                      >
                        {opt.label} x
                      </button>
                    ))}
                  </div>
                )}
                <div className={styles.hint}>Добавлено ответов: {options.length}</div>
                <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 0' }} />
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>Массовое добавление (по строкам или через ;)</div>
                <Input
                  as="textarea"
                  rows={3}
                  value={bulkOptions}
                  onChange={(v) => onBulkOptionsChange(String(v ?? ''))}
                  placeholder="Например: Да; Нет; Затрудняюсь ответить"
                />
                <button type="button" className={styles.headerTextButton} onClick={onBulkOptionsAdd} disabled={bulkOptionPreviewCount === 0}>
                  {bulkOptionPreviewCount > 0 ? `Добавить ответы (${bulkOptionPreviewCount})` : 'Добавить ответы'}
                </button>
                <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 0' }} />
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>Исключающие варианты (выбор снимает остальные)</div>
                <CheckPicker
                  data={options.map((opt) => ({ value: opt.id, label: opt.label }))}
                  value={exclusiveOptionIds}
                  onChange={(value) => onExclusiveOptionIdsChange((value as string[]) ?? [])}
                  placeholder="Выберите варианты"
                  cleanable
                  searchable={false}
                  block
                />
                <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 0' }} />
                <div style={{ fontSize: 12, fontWeight: 500 }}>Баллы за вариант ответа</div>
                <div className={styles.hint}>
                  Вес вопроса считается автоматически: для одиночного выбора максимум по вариантам, для множественного — сумма.
                </div>
                <div style={{ fontSize: 13 }}>Вес вопроса (авто): {getChoiceQuestionWeight(questionType, options)} баллов</div>
                {options.map((opt) => (
                  <div key={`${opt.id}-points`} style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: 10, alignItems: 'center' }}>
                    <span>{opt.label}</span>
                    <Input value={opt.points} onChange={(v) => onOptionPointsChange(opt.id, String(v ?? ''))} placeholder="0" type="number" />
                  </div>
                ))}
              </div>
            )}

            {!CHOICE_TYPES.has(questionType) && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Вес вопроса</div>
                <Input value={weight} onChange={(v) => onWeightChange(String(v ?? ''))} placeholder="0" type="number" />
              </div>
            )}
          </div>

          <div className={styles.modalBlock}>
            <div style={{ display: 'grid', gap: 8 }}>
              <Checkbox checked={required} onChange={(_, checked) => onRequiredChange(Boolean(checked))}>
                Обязательный вопрос - сделать вопрос обязательным
              </Checkbox>
              <Checkbox checked={allowNa} onChange={(_, checked) => onAllowNaChange(Boolean(checked))}>
                Разрешить ответ NA (не применимо)
              </Checkbox>
              <Checkbox checked={allowComment} onChange={(_, checked) => onAllowCommentChange(Boolean(checked))}>
                Разрешить комментарий
              </Checkbox>
              {allowComment && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Режим комментария *</div>
                  <SelectPicker
                    value={commentMode}
                    onChange={(v) => onCommentModeChange(String(v ?? COMMENT_MODE_FREE))}
                    data={[
                      ...(CHOICE_TYPES.has(questionType)
                        ? [{ value: COMMENT_MODE_OPTION, label: 'Выбирать вариант ответа для комментария' }]
                        : []),
                      { value: COMMENT_MODE_FREE, label: 'Разрешить свободный комментарий' },
                    ]}
                    cleanable={false}
                    searchable={false}
                    block
                  />
                  {commentMode === COMMENT_MODE_OPTION && CHOICE_TYPES.has(questionType) && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Варианты, для которых разрешен комментарий</div>
                      <CheckPicker
                        data={options.map((opt) => ({ value: opt.id, label: opt.label }))}
                        value={commentOptionIds}
                        onChange={(value) => onCommentOptionIdsChange((value as string[]) ?? [])}
                        placeholder="Выберите варианты"
                        cleanable
                        searchable={false}
                        block
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {error ? <div className={styles.error} style={{ marginTop: 10 }}>{error}</div> : null}
      </Modal.Body>
      <Modal.Footer>
        <div className={styles.modalFooterActions}>
          <button type="button" className={styles.headerTextButton} onClick={onClose} disabled={isAdding}>
            Отмена
          </button>
          <button type="button" className={styles.headerTextButton} onClick={onSubmit} disabled={isAdding}>
            Добавить
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}
