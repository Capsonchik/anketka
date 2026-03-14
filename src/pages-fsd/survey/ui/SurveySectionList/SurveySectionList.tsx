'use client'

import { useCallback, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'

import type { SurveyBuilderResponse, SurveyPageItem, SurveyQuestionItem } from '@/entities/survey'

import { SurveySectionCard } from './SurveySectionCard'
import styles from './SurveySectionList.module.css'

export type SurveySectionListProps = {
  builder: SurveyBuilderResponse
  canEdit: boolean
  onAddSection: () => void
  onAddQuestion: (pageId: string) => void
  onEditQuestion: (q: SurveyQuestionItem, pageTitle: string) => void
  onDeleteQuestion: (questionId: string) => void
  onDeleteSection: (pageId: string) => void
  onReorder: (pageIds: string[], questionIds: string[]) => void
}

export function SurveySectionList ({
  builder,
  canEdit,
  onAddSection,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onDeleteSection,
  onReorder,
}: SurveySectionListProps) {
  const [expandedPages, setExpandedPages] = useState<Set<string>>(() => new Set(builder.pages.map((p) => p.id)))

  const togglePage = useCallback((pageId: string) => {
    setExpandedPages((prev) => {
      const next = new Set(prev)
      if (next.has(pageId)) next.delete(pageId)
      else next.add(pageId)
      return next
    })
  }, [])

  const pageIds = builder.pages.map((p) => p.id)
  const allQuestionIds = builder.pages.flatMap((p) => p.questions.map((q) => q.id))

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd (event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeStr = String(active.id)
    const overStr = String(over.id)

    const isPage = pageIds.includes(activeStr)
    const overIsPage = pageIds.includes(overStr)

    if (isPage && overIsPage) {
      const oldIndex = pageIds.indexOf(activeStr)
      const newIndex = pageIds.indexOf(overStr)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(pageIds, oldIndex, newIndex)
      onReorder(reordered, [])
      return
    }

    if (!isPage && !overIsPage && allQuestionIds.includes(activeStr) && allQuestionIds.includes(overStr)) {
      const oldIndex = allQuestionIds.indexOf(activeStr)
      const newIndex = allQuestionIds.indexOf(overStr)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(allQuestionIds, oldIndex, newIndex)
      onReorder([], reordered)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.scoreHint}>
          {builder.maxScore != null ? `Стоимость анкеты: 100% = ${builder.maxScore} баллов` : 'Добавьте вопросы с баллами'}
        </span>
        {canEdit && (
          <button type="button" className={styles.addSectionBtn} onClick={onAddSection}>
            + Добавить секцию
          </button>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={[...pageIds, ...allQuestionIds]} strategy={verticalListSortingStrategy}>
          <div className={styles.sections}>
            {builder.pages.map((page) => (
              <SurveySectionCard
                key={page.id}
                page={page}
                isExpanded={expandedPages.has(page.id)}
                onToggle={() => togglePage(page.id)}
                canEdit={canEdit}
                onAddQuestion={() => onAddQuestion(page.id)}
                onEditQuestion={(q) => onEditQuestion(q, page.title)}
                onDeleteQuestion={onDeleteQuestion}
                onDeleteSection={() => onDeleteSection(page.id)}
                allQuestionIds={allQuestionIds}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
