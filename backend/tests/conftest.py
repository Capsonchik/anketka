"""Pytest fixtures for backend tests."""

from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest


def _opt (value: str, points: float = 0, is_exclusive: bool = False, is_na: bool = False):
  return SimpleNamespace(value=value, points=Decimal(str(points)), is_exclusive=is_exclusive, is_na=is_na)


def _q (qid, qtype: str, code: str | None = None, weight: float = 0):
  return SimpleNamespace(id=qid, type=qtype, code=code, weight=Decimal(str(weight)))


@pytest.fixture
def sample_questions_and_options ():
  """Minimal survey structure for scoring tests."""
  q1_id = uuid4()
  q2_id = uuid4()

  q1 = _q(q1_id, 'single_choice', 'q1')
  q2 = _q(q2_id, 'multi_choice', 'q2')

  o1a = _opt('a', 3)
  o1b = _opt('b', 2)
  o1c = _opt('na', 0, is_na=True)

  o2a = _opt('x', 1)
  o2b = _opt('y', 2, is_exclusive=True)

  questions = [q1, q2]
  options_by_q = {q1_id: [o1a, o1b, o1c], q2_id: [o2a, o2b]}

  return questions, options_by_q, {'q1': q1_id, 'q2': q2_id}
