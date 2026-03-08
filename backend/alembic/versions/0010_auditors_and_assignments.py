"""auditors and project_survey assignments

Revision ID: 0010_auditors_assignments
Revises: 0009_survey_builder
Create Date: 2026-03-07

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0010_auditors_assignments'
down_revision = '0009_survey_builder'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.create_table(
    'auditor',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('last_name', sa.String(length=120), nullable=False),
    sa.Column('first_name', sa.String(length=120), nullable=False),
    sa.Column('middle_name', sa.String(length=120), nullable=True),
    sa.Column('phone', sa.String(length=32), nullable=True),
    sa.Column('email', sa.String(length=320), nullable=True),
    sa.Column('city', sa.String(length=250), nullable=False),
    sa.Column('birth_date', sa.Date(), nullable=True),
    sa.Column('gender', sa.String(length=16), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['company_id'], ['users.company.id'], ondelete='RESTRICT'),
    sa.UniqueConstraint('company_id', 'email', 'phone', name='uq_projects_auditor_company_email_phone'),
    schema='projects',
  )
  op.create_index('ix_projects_auditor_company_id', 'auditor', ['company_id'], schema='projects')
  op.create_index('ix_projects_auditor_last_name', 'auditor', ['last_name'], schema='projects')
  op.create_index('ix_projects_auditor_first_name', 'auditor', ['first_name'], schema='projects')
  op.create_index('ix_projects_auditor_phone', 'auditor', ['phone'], schema='projects')
  op.create_index('ix_projects_auditor_email', 'auditor', ['email'], schema='projects')
  op.create_index('ix_projects_auditor_city', 'auditor', ['city'], schema='projects')

  op.create_table(
    'project_survey_auditor',
    sa.Column('project_id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('survey_id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('auditor_id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['project_id'], ['projects.project.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['survey_id'], ['projects.survey.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['auditor_id'], ['projects.auditor.id'], ondelete='CASCADE'),
    sa.UniqueConstraint('project_id', 'survey_id', 'auditor_id', name='uq_projects_project_survey_auditor_unique'),
    schema='projects',
  )
  op.create_index('ix_projects_project_survey_auditor_project_id', 'project_survey_auditor', ['project_id'], schema='projects')
  op.create_index('ix_projects_project_survey_auditor_survey_id', 'project_survey_auditor', ['survey_id'], schema='projects')
  op.create_index('ix_projects_project_survey_auditor_auditor_id', 'project_survey_auditor', ['auditor_id'], schema='projects')


def downgrade () -> None:
  op.drop_index('ix_projects_project_survey_auditor_auditor_id', table_name='project_survey_auditor', schema='projects')
  op.drop_index('ix_projects_project_survey_auditor_survey_id', table_name='project_survey_auditor', schema='projects')
  op.drop_index('ix_projects_project_survey_auditor_project_id', table_name='project_survey_auditor', schema='projects')
  op.drop_table('project_survey_auditor', schema='projects')

  op.drop_index('ix_projects_auditor_city', table_name='auditor', schema='projects')
  op.drop_index('ix_projects_auditor_email', table_name='auditor', schema='projects')
  op.drop_index('ix_projects_auditor_phone', table_name='auditor', schema='projects')
  op.drop_index('ix_projects_auditor_first_name', table_name='auditor', schema='projects')
  op.drop_index('ix_projects_auditor_last_name', table_name='auditor', schema='projects')
  op.drop_index('ix_projects_auditor_company_id', table_name='auditor', schema='projects')
  op.drop_table('auditor', schema='projects')

