'use client'

import Image from 'next/image'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { SurveyPageItem, SurveyQuestionItem } from '@/entities/survey'

import styles from './SurveySectionList.module.css'

type SurveySectionCardProps = {
  page: SurveyPageItem
  isExpanded: boolean
  onToggle: () => void
  canEdit: boolean
  onAddQuestion: () => void
  onEditQuestion: (q: SurveyQuestionItem) => void
  onDeleteQuestion: (questionId: string) => void
  onDeleteSection: () => void
  allQuestionIds: string[]
}

export function SurveySectionCard ({
  page,
  isExpanded,
  onToggle,
  canEdit,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onDeleteSection,
  allQuestionIds,
}: SurveySectionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isLoop = page.sectionType === 'loop'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.sectionCard} ${isDragging ? styles.sectionCardDragging : ''}`}
    >
      <div className={styles.sectionHeader}>
        <div className={styles.sectionDragHandle} {...attributes} {...listeners} aria-label="Перетащить секцию">
          <DragIcon />
        </div>
        <button type="button" className={styles.sectionTitleBtn} onClick={onToggle}>
          {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          <span>{page.title}</span>
          {isLoop && <span className={styles.loopBadge}>Цикл</span>}
        </button>
        <span className={styles.questionCount}>{page.questions.length} вопросов</span>
        {canEdit && (
          <div className={styles.sectionActions}>
            <button type="button" className={styles.iconBtn} onClick={onAddQuestion} aria-label="Добавить вопрос">
              <Image src="/icons/add.svg" alt="" width={14} height={14} aria-hidden="true" />
            </button>
            <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={onDeleteSection} aria-label="Удалить секцию">
              <Image src="/icons/trash.svg" alt="" width={14} height={14} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className={styles.sectionBody}>
          {page.questions.length === 0 ? (
            <div className={styles.emptySection}>
              {canEdit ? (
                <button type="button" className={styles.addQuestionBtn} onClick={onAddQuestion}>
                  + Добавить вопрос
                </button>
              ) : (
                <span className={styles.hint}>Нет вопросов</span>
              )}
            </div>
          ) : (
            <div className={styles.questionsList}>
              {page.questions.map((q) => (
                <SurveyQuestionRow
                  key={q.id}
                  question={q}
                  canEdit={canEdit}
                  onEdit={() => onEditQuestion(q)}
                  onDelete={() => onDeleteQuestion(q.id)}
                  allQuestionIds={allQuestionIds}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SurveyQuestionRow ({
  question,
  canEdit,
  onEdit,
  onDelete,
  allQuestionIds,
}: {
  question: SurveyQuestionItem
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
  allQuestionIds: string[]
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.questionRow} ${isDragging ? styles.questionRowDragging : ''}`}
    >
      {canEdit && (
        <div className={styles.questionDragHandle} {...attributes} {...listeners} aria-label="Перетащить вопрос">
          <DragIcon />
        </div>
      )}
      <div className={styles.questionContent}>
        <span className={styles.questionCode}>{question.code || '—'}</span>
        <span className={styles.questionTitle}>{question.title}</span>
        <span className={styles.questionType}>{question.type}</span>
        <span className={styles.questionMeta}>
          {question.required ? 'Обяз.' : ''} {question.weight ? `Вес: ${question.weight}` : ''}
        </span>
      </div>
      {canEdit && (
        <div className={styles.questionActions}>
          <button type="button" className={styles.iconBtn} onClick={onEdit} aria-label="Редактировать">
            <Image src="/icons/edit.svg" alt="" width={14} height={14} aria-hidden="true" />
          </button>
          <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={onDelete} aria-label="Удалить">
            <Image src="/icons/trash.svg" alt="" width={14} height={14} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}

function DragIcon () {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ChevronDownIcon () {
  return <Image src="/icons/arrow-down.svg" alt="" width={14} height={14} aria-hidden="true" />
}

function ChevronRightIcon () {
  return <Image src="/icons/arrow-right.svg" alt="" width={14} height={14} aria-hidden="true" />
}
