import { SurveyEditorPage } from '@/pages-fsd/survey-editor'

export default async function SurveyRoute ({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SurveyEditorPage surveyId={id} />
}
