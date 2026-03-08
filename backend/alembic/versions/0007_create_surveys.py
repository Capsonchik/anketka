"""create surveys and project_survey tables

Revision ID: 0007_surveys
Revises: 0006_addressbook_checklists
Create Date: 2026-03-07

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0007_surveys'
down_revision = '0006_addressbook_checklists'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.create_table(
    'survey',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('title', sa.String(length=250), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['company_id'], ['users.company.id'], ondelete='RESTRICT'),
    sa.UniqueConstraint('company_id', 'title', name='uq_projects_survey_company_title'),
    schema='projects',
  )
  op.create_index('ix_projects_survey_company_id', 'survey', ['company_id'], schema='projects')
  op.create_index('ix_projects_survey_title', 'survey', ['title'], schema='projects')

  op.create_table(
    'project_survey',
    sa.Column('project_id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('survey_id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('attached_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['project_id'], ['projects.project.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['survey_id'], ['projects.survey.id'], ondelete='RESTRICT'),
    sa.UniqueConstraint('project_id', 'survey_id', name='uq_projects_project_survey_unique'),
    schema='projects',
  )
  op.create_index('ix_projects_project_survey_project_id', 'project_survey', ['project_id'], schema='projects')
  op.create_index('ix_projects_project_survey_survey_id', 'project_survey', ['survey_id'], schema='projects')


def downgrade () -> None:
  op.drop_index('ix_projects_project_survey_survey_id', table_name='project_survey', schema='projects')
  op.drop_index('ix_projects_project_survey_project_id', table_name='project_survey', schema='projects')
  op.drop_table('project_survey', schema='projects')

  op.drop_index('ix_projects_survey_title', table_name='survey', schema='projects')
  op.drop_index('ix_projects_survey_company_id', table_name='survey', schema='projects')
  op.drop_table('survey', schema='projects')

