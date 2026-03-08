"""survey invites (public links)

Revision ID: 0012_survey_invites
Revises: 0011_assigned_by
Create Date: 2026-03-08

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0012_survey_invites'
down_revision = '0011_assigned_by'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.create_table(
    'survey_invite',
    sa.Column('token', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('survey_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('auditor_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('purpose', sa.String(length=24), server_default='assignment', nullable=False),
    sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['project_id'], ['projects.project.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['survey_id'], ['projects.survey.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['auditor_id'], ['projects.auditor.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['created_by_user_id'], ['users.app_user.id'], ondelete='SET NULL'),
    schema='projects',
  )

  op.create_index('ix_projects_survey_invite_project_id', 'survey_invite', ['project_id'], schema='projects')
  op.create_index('ix_projects_survey_invite_survey_id', 'survey_invite', ['survey_id'], schema='projects')
  op.create_index('ix_projects_survey_invite_auditor_id', 'survey_invite', ['auditor_id'], schema='projects')
  op.create_index('ix_projects_survey_invite_purpose', 'survey_invite', ['purpose'], schema='projects')
  op.create_index('ix_projects_survey_invite_created_by_user_id', 'survey_invite', ['created_by_user_id'], schema='projects')


def downgrade () -> None:
  op.drop_index('ix_projects_survey_invite_created_by_user_id', table_name='survey_invite', schema='projects')
  op.drop_index('ix_projects_survey_invite_purpose', table_name='survey_invite', schema='projects')
  op.drop_index('ix_projects_survey_invite_auditor_id', table_name='survey_invite', schema='projects')
  op.drop_index('ix_projects_survey_invite_survey_id', table_name='survey_invite', schema='projects')
  op.drop_index('ix_projects_survey_invite_project_id', table_name='survey_invite', schema='projects')
  op.drop_table('survey_invite', schema='projects')

