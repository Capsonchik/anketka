"""Tests for survey scoring service."""

import pytest

from app.services.scoring import compute_survey_score


def test_single_choice_max_score (sample_questions_and_options):
  questions, options_by_q, code_to_id = sample_questions_and_options
  q1_id = code_to_id['q1']
  q1 = next(q for q in questions if q.id == q1_id)
  q1.code = 'q1'

  score_total, score_max, score_pct, breakdown = compute_survey_score(
    questions, options_by_q, {'q1': 'a'}, {'q1': q1_id},
  )
  assert float(score_total) == 3
  assert float(score_max) == 3
  assert float(score_pct) == 100


def test_single_choice_partial (sample_questions_and_options):
  questions, options_by_q, code_to_id = sample_questions_and_options
  q1_id = code_to_id['q1']
  q1 = next(q for q in questions if q.id == q1_id)
  q1.code = 'q1'

  score_total, score_max, score_pct, breakdown = compute_survey_score(
    questions, options_by_q, {'q1': 'b'}, {'q1': q1_id},
  )
  assert float(score_total) == 2
  assert float(score_max) == 3
  assert 66 <= float(score_pct) <= 67


def test_single_choice_na_zeros_question (sample_questions_and_options):
  questions, options_by_q, code_to_id = sample_questions_and_options
  q1_id = code_to_id['q1']
  q1 = next(q for q in questions if q.id == q1_id)
  q1.code = 'q1'

  score_total, score_max, score_pct, breakdown = compute_survey_score(
    questions, options_by_q, {'q1': 'na'}, {'q1': q1_id},
  )
  assert float(score_total) == 0
  assert float(score_max) == 0
  assert float(score_pct) == 0


def test_multi_choice_exclusive (sample_questions_and_options):
  questions, options_by_q, code_to_id = sample_questions_and_options
  q2_id = code_to_id['q2']
  q2 = next(q for q in questions if q.id == q2_id)
  q2.code = 'q2'

  score_total, score_max, score_pct, breakdown = compute_survey_score(
    questions, options_by_q, {'q2': ['y']}, {'q2': q2_id},
  )
  assert float(score_total) == 2
  assert float(score_max) == 2
  assert float(score_pct) == 100


def test_empty_answers (sample_questions_and_options):
  questions, options_by_q, code_to_id = sample_questions_and_options
  q1_id = code_to_id['q1']
  q2_id = code_to_id['q2']
  for q in questions:
    q.code = 'q1' if q.id == q1_id else 'q2'

  score_total, score_max, score_pct, breakdown = compute_survey_score(
    questions, options_by_q, {}, {'q1': q1_id, 'q2': q2_id},
  )
  assert float(score_total) == 0
  assert float(score_max) == 5
  assert float(score_pct) == 0
