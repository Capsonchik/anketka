"""survey attempts (public submissions)

Revision ID: 0013_survey_attempts
Revises: 0012_survey_invites
Create Date: 2026-03-08

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0013_survey_attempts'
down_revision = '0012_survey_invites'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.create_table(
    'survey_attempt',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('invite_token', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('survey_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('auditor_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('answers', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['invite_token'], ['projects.survey_invite.token'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['project_id'], ['projects.project.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['survey_id'], ['projects.survey.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['auditor_id'], ['projects.auditor.id'], ondelete='SET NULL'),
    schema='projects',
  )
  op.create_index('ix_projects_survey_attempt_invite_token', 'survey_attempt', ['invite_token'], schema='projects')
  op.create_index('ix_projects_survey_attempt_project_id', 'survey_attempt', ['project_id'], schema='projects')
  op.create_index('ix_projects_survey_attempt_survey_id', 'survey_attempt', ['survey_id'], schema='projects')
  op.create_index('ix_projects_survey_attempt_auditor_id', 'survey_attempt', ['auditor_id'], schema='projects')


def downgrade () -> None:
  op.drop_index('ix_projects_survey_attempt_auditor_id', table_name='survey_attempt', schema='projects')
  op.drop_index('ix_projects_survey_attempt_survey_id', table_name='survey_attempt', schema='projects')
  op.drop_index('ix_projects_survey_attempt_project_id', table_name='survey_attempt', schema='projects')
  op.drop_index('ix_projects_survey_attempt_invite_token', table_name='survey_attempt', schema='projects')
  op.drop_table('survey_attempt', schema='projects')

