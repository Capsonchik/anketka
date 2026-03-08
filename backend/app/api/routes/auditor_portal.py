from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_auditor
from app.db.session import get_db
from app.models.auditor import Auditor
from app.models.project import Project
from app.models.project_survey_auditor import ProjectSurveyAuditor
from app.models.survey import Survey
from app.models.survey_invite import SurveyInvite
from app.schemas.auditor_portal import (
  AuditorAssignmentItem,
  AuditorAssignmentsResponse,
  AuditorAssignmentStatusRequest,
  AuditorMeResponse,
  AuditorPublic,
)


router = APIRouter()


def _now_utc () -> datetime:
  return datetime.now(timezone.utc)


def to_auditor_public (a: Auditor) -> AuditorPublic:
  return AuditorPublic(
    id=a.id,
    companyId=a.company_id,
    firstName=a.first_name,
    lastName=a.last_name,
    middleName=a.middle_name,
    email=a.email,
    phone=a.phone,
    city=a.city,
  )


async def _get_or_create_assignment_invite (
  *,
  db: AsyncSession,
  project_id: UUID,
  survey_id: UUID,
  auditor_id: UUID,
) -> UUID:
  res = await db.execute(
    select(SurveyInvite)
    .where(
      SurveyInvite.project_id == project_id,
      SurveyInvite.survey_id == survey_id,
      SurveyInvite.auditor_id == auditor_id,
      SurveyInvite.purpose == 'assignment',
      SurveyInvite.revoked_at.is_(None),
    )
    .order_by(SurveyInvite.created_at.desc())
    .limit(1),
  )
  inv = res.scalar_one_or_none()
  if inv is not None:
    return inv.token

  inv = SurveyInvite(
    token=uuid4(),
    project_id=project_id,
    survey_id=survey_id,
    auditor_id=auditor_id,
    purpose='assignment',
    created_by_user_id=None,
  )
  db.add(inv)
  await db.flush()
  return inv.token


@router.get('/me', response_model=AuditorMeResponse)
async def me (
  auditor: Auditor = Depends(get_current_auditor),
) -> AuditorMeResponse:
  return AuditorMeResponse(auditor=to_auditor_public(auditor))


@router.get('/assignments', response_model=AuditorAssignmentsResponse)
async def list_assignments (
  db: AsyncSession = Depends(get_db),
  auditor: Auditor = Depends(get_current_auditor),
) -> AuditorAssignmentsResponse:
  res = await db.execute(
    select(ProjectSurveyAuditor, Project, Survey)
    .join(Project, Project.id == ProjectSurveyAuditor.project_id)
    .join(Survey, Survey.id == ProjectSurveyAuditor.survey_id)
    .where(
      ProjectSurveyAuditor.auditor_id == auditor.id,
      Project.company_id == auditor.company_id,
      Survey.company_id == auditor.company_id,
    )
    .order_by(ProjectSurveyAuditor.assigned_at.desc()),
  )

  items: list[AuditorAssignmentItem] = []
  for link, project, survey in res.all():
    token = await _get_or_create_assignment_invite(db=db, project_id=project.id, survey_id=survey.id, auditor_id=auditor.id)
    items.append(
      AuditorAssignmentItem(
        projectId=project.id,
        projectName=project.name,
        surveyId=survey.id,
        surveyTitle=survey.title,
        status=link.status,
        assignedAt=link.assigned_at,
        acceptedAt=link.accepted_at,
        declinedAt=link.declined_at,
        inProgressAt=link.in_progress_at,
        inviteToken=token,
      ),
    )

  await db.commit()
  return AuditorAssignmentsResponse(items=items)


@router.post('/assignments/{project_id}/{survey_id}/status', status_code=204)
async def update_assignment_status (
  project_id: UUID,
  survey_id: UUID,
  payload: AuditorAssignmentStatusRequest,
  db: AsyncSession = Depends(get_db),
  auditor: Auditor = Depends(get_current_auditor),
) -> None:
  status_in = payload.status.strip().lower()
  if status_in not in ('accepted', 'declined'):
    raise HTTPException(status_code=400, detail='Недопустимый статус')

  res = await db.execute(
    select(ProjectSurveyAuditor)
    .where(
      ProjectSurveyAuditor.project_id == project_id,
      ProjectSurveyAuditor.survey_id == survey_id,
      ProjectSurveyAuditor.auditor_id == auditor.id,
    ),
  )
  link = res.scalar_one_or_none()
  if link is None:
    raise HTTPException(status_code=404, detail='Назначение не найдено')

  if link.status == 'declined' and status_in == 'accepted':
    raise HTTPException(status_code=400, detail='Назначение отклонено')

  now = _now_utc()
  if status_in == 'accepted':
    link.status = 'accepted'
    link.accepted_at = link.accepted_at or now
  else:
    link.status = 'declined'
    link.declined_at = link.declined_at or now

  await db.commit()
  return None

