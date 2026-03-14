export type SurveyCategory = 'price_monitoring' | 'mystery'

export type SurveyStatus = 'created' | 'moderation' | 'published' | 'archived'

export type SurveyItem = {
  id: string
  title: string
  category: SurveyCategory
  templateKey?: string | null
  status: SurveyStatus
  publishedAt?: string | null
  archivedAt?: string | null
  version?: number
  contextBindings?: Record<string, unknown> | null
  createdAt: string
}

export type SurveysResponse = {
  items: SurveyItem[]
}

export type SurveyResponse = {
  survey: SurveyItem
}

export type SurveyAttachedProjectItem = {
  id: string
  name: string
  attachedAt: string
}

export type SurveyAttachedProjectsResponse = {
  items: SurveyAttachedProjectItem[]
}

export type SurveyCreateRequest = {
  title: string
  category: SurveyCategory
}

export type SurveyCreateResponse = {
  survey: SurveyItem
}

export type SurveyUpdateRequest = SurveyCreateRequest

export type SurveyUpdateResponse = {
  survey: SurveyItem
}

export type SurveyApplyTemplateRequest = {
  templateKey: string
}

export type SurveyQuestionOptionItem = {
  id: string
  label: string
  value: string
  sortOrder: number
  points?: number
  isExclusive?: boolean
  isNA?: boolean
}

export type SurveyQuestionItem = {
  id: string
  type: string
  code?: string | null
  title: string
  description?: string | null
  required: boolean
  sortOrder: number
  config?: Record<string, unknown> | null
  validation?: Record<string, unknown> | null
  logic?: Record<string, unknown> | null
  scoring?: Record<string, unknown> | null
  display?: Record<string, unknown> | null
  media?: Record<string, unknown> | null
  analyticsKey?: string | null
  weight?: number
  allowNa?: boolean
  allowComment?: boolean
  dynamicTitleTemplate?: string | null
  options: SurveyQuestionOptionItem[]
}

export type SectionType = 'regular' | 'loop'

export type SurveyPageItem = {
  id: string
  title: string
  sortOrder: number
  sectionType?: SectionType
  loopConfig?: Record<string, unknown> | null
  questions: SurveyQuestionItem[]
}

export type SurveyBuilderResponse = {
  surveyId: string
  pages: SurveyPageItem[]
  maxScore?: number | null
  status?: SurveyStatus
}

export type SurveyQuestionUpdateRequest = {
  title: string
  required: boolean
  sortOrder?: number | null
  code?: string | null
  description?: string | null
  validation?: Record<string, unknown> | null
  logic?: Record<string, unknown> | null
  scoring?: Record<string, unknown> | null
  display?: Record<string, unknown> | null
  media?: Record<string, unknown> | null
  analyticsKey?: string | null
  weight?: number | null
  allowNa?: boolean | null
  allowComment?: boolean | null
  dynamicTitleTemplate?: string | null
}

export type SurveyQuestionResponse = {
  question: SurveyQuestionItem
}

export type ProjectSurveysResponse = {
  items: SurveyItem[]
}

export type ProjectSurveyAttachRequest = {
  surveyId: string
}

