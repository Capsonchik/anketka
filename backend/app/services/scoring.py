"""Сервис расчёта баллов анкеты по ответам с учётом NA и exclusive."""

from decimal import Decimal
from uuid import UUID

from sqlalchemy import select

from app.models.survey_question import SurveyQuestion
from app.models.survey_question_option import SurveyQuestionOption


def _decimal(val: float | int | Decimal | None) -> Decimal:
  if val is None:
    return Decimal('0')
  return Decimal(str(val))


def _question_max_score(
  question: SurveyQuestion,
  options: list[SurveyQuestionOption],
) -> Decimal:
  """Максимальный балл вопроса: либо weight, либо max points среди опций (для choice)."""
  if question.type in ('single_choice', 'multi_choice'):
    if not options:
      return _decimal(question.weight)
    max_opt = max((_decimal(o.points) for o in options if not o.is_na), default=Decimal('0'))
    return max(max_opt, _decimal(question.weight))
  return _decimal(question.weight)


def _question_score_from_answer(
  question: SurveyQuestion,
  options: list[SurveyQuestionOption],
  answer: str | list[str] | None,
) -> tuple[Decimal, Decimal, bool]:
  """
  Возвращает (набранный_балл, max_балл_вопрос, is_na_answered).
  NA-ответ обнуляет стоимость вопроса (max=0 для расчёта процента).
  """
  max_score = _question_max_score(question, options)
  options_by_value: dict[str, SurveyQuestionOption] = {o.value: o for o in options}

  def get_opt(val: str) -> SurveyQuestionOption | None:
    return options_by_value.get(str(val).strip())

  if answer is None or answer == '' or answer == []:
    return Decimal('0'), max_score, False

  if question.type == 'single_choice':
    opt = get_opt(str(answer)) if isinstance(answer, str) else None
    if opt is None:
      return Decimal('0'), max_score, False
    if opt.is_na:
      return Decimal('0'), Decimal('0'), True
    return _decimal(opt.points), max_score, False

  if question.type == 'multi_choice':
    vals = answer if isinstance(answer, list) else [answer]
    opts = [get_opt(str(v)) for v in vals if v]
    opts = [o for o in opts if o is not None]
    if not opts:
      return Decimal('0'), max_score, False
    if any(o.is_na for o in opts):
      return Decimal('0'), Decimal('0'), True
    exclusive = [o for o in opts if o.is_exclusive]
    if exclusive:
      return _decimal(exclusive[0].points), max_score, False
    total = sum(_decimal(o.points) for o in opts)
    return total, max_score, False

  if question.type in ('short_text', 'long_text', 'number', 'email', 'date', 'time', 'rank', 'scale', 'photo'):
    if answer and str(answer).strip():
      return max_score, max_score, False
    return Decimal('0'), max_score, False

  return _decimal(question.weight) if answer else Decimal('0'), max_score, False


def compute_survey_score(
  questions: list[SurveyQuestion],
  options_by_q: dict[UUID, list[SurveyQuestionOption]],
  answers: dict[str, str | list[str] | None],
  code_to_id: dict[str, UUID] | None = None,
) -> tuple[Decimal, Decimal, Decimal, dict]:
  """
  Вычисляет баллы анкеты по ответам.
  answers: { question_code: value } или { question_id: value }
  Возвращает (score_total, score_max, score_percent, score_breakdown).
  """
  score_total = Decimal('0')
  score_max = Decimal('0')
  breakdown: dict[str, dict] = {}

  for q in questions:
    opts = options_by_q.get(q.id, [])
    key = q.code or str(q.id)
    raw_val = answers.get(key) or answers.get(str(q.id))
    if code_to_id:
      for k, vid in code_to_id.items():
        if vid == q.id and k in answers:
          raw_val = answers.get(k)
          break

    got, max_q, _ = _question_score_from_answer(q, opts, raw_val)
    score_total += got
    score_max += max_q
    breakdown[str(q.id)] = {
      'questionId': str(q.id),
      'code': q.code,
      'score': float(got),
      'max': float(max_q),
    }

  if score_max == 0:
    return score_total, score_max, Decimal('0'), {'byQuestion': breakdown}
  pct = (score_total / score_max * 100).quantize(Decimal('0.01'))
  return score_total, score_max, pct, {'byQuestion': breakdown}
