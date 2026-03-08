"""auditor portal: auth + assignment status

Revision ID: 0014_auditor_portal
Revises: 0013_survey_attempts
Create Date: 2026-03-08

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0014_auditor_portal'
down_revision = '0013_survey_attempts'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.add_column('auditor', sa.Column('password_hash', sa.String(length=255), nullable=True), schema='projects')

  op.add_column(
    'project_survey_auditor',
    sa.Column('status', sa.String(length=24), server_default='assigned', nullable=False),
    schema='projects',
  )
  op.add_column('project_survey_auditor', sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True), schema='projects')
  op.add_column('project_survey_auditor', sa.Column('declined_at', sa.DateTime(timezone=True), nullable=True), schema='projects')
  op.add_column('project_survey_auditor', sa.Column('in_progress_at', sa.DateTime(timezone=True), nullable=True), schema='projects')
  op.create_index('ix_projects_project_survey_auditor_status', 'project_survey_auditor', ['status'], schema='projects')

  op.create_table(
    'auditor_refresh_token',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('auditor_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('jti', sa.String(length=64), nullable=False),
    sa.Column('token_hash', sa.String(length=64), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['auditor_id'], ['projects.auditor.id'], ondelete='CASCADE'),
    sa.UniqueConstraint('jti'),
    sa.UniqueConstraint('token_hash'),
    schema='projects',
  )
  op.create_index('ix_projects_auditor_refresh_token_auditor_id', 'auditor_refresh_token', ['auditor_id'], schema='projects')
  op.create_index('ix_projects_auditor_refresh_token_jti', 'auditor_refresh_token', ['jti'], schema='projects')
  op.create_index('ix_projects_auditor_refresh_token_token_hash', 'auditor_refresh_token', ['token_hash'], schema='projects')


def downgrade () -> None:
  op.drop_index('ix_projects_auditor_refresh_token_token_hash', table_name='auditor_refresh_token', schema='projects')
  op.drop_index('ix_projects_auditor_refresh_token_jti', table_name='auditor_refresh_token', schema='projects')
  op.drop_index('ix_projects_auditor_refresh_token_auditor_id', table_name='auditor_refresh_token', schema='projects')
  op.drop_table('auditor_refresh_token', schema='projects')

  op.drop_index('ix_projects_project_survey_auditor_status', table_name='project_survey_auditor', schema='projects')
  op.drop_column('project_survey_auditor', 'in_progress_at', schema='projects')
  op.drop_column('project_survey_auditor', 'declined_at', schema='projects')
  op.drop_column('project_survey_auditor', 'accepted_at', schema='projects')
  op.drop_column('project_survey_auditor', 'status', schema='projects')

  op.drop_column('auditor', 'password_hash', schema='projects')

