import { SurveyPage } from '@/pages-fsd/survey/index'

export default async function SurveyRoute ({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SurveyPage surveyId={id} />
}
