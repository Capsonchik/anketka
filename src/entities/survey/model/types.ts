export type SurveyCategory = 'price_monitoring' | 'mystery'

export type SurveyItem = {
  id: string
  title: string
  category: SurveyCategory
  templateKey?: string | null
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
}

export type SurveyQuestionItem = {
  id: string
  type: string
  title: string
  required: boolean
  sortOrder: number
  config?: Record<string, unknown> | null
  options: SurveyQuestionOptionItem[]
}

export type SurveyPageItem = {
  id: string
  title: string
  sortOrder: number
  questions: SurveyQuestionItem[]
}

export type SurveyBuilderResponse = {
  surveyId: string
  pages: SurveyPageItem[]
}

export type SurveyQuestionUpdateRequest = {
  title: string
  required: boolean
  sortOrder?: number | null
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

