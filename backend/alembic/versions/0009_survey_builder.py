"""survey builder schema (pages/questions/options) + template_key

Revision ID: 0009_survey_builder
Revises: 0008_survey_category
Create Date: 2026-03-07

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0009_survey_builder'
down_revision = '0008_survey_category'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.add_column('survey', sa.Column('template_key', sa.String(length=64), nullable=True), schema='projects')
  op.create_index('ix_projects_survey_template_key', 'survey', ['template_key'], schema='projects')

  op.create_table(
    'survey_page',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('survey_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('title', sa.String(length=250), nullable=False),
    sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
    sa.ForeignKeyConstraint(['survey_id'], ['projects.survey.id'], ondelete='CASCADE'),
    schema='projects',
  )
  op.create_index('ix_projects_survey_page_survey_id', 'survey_page', ['survey_id'], schema='projects')

  op.create_table(
    'survey_question',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('survey_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('page_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('type', sa.String(length=48), nullable=False),
    sa.Column('title', sa.String(length=500), nullable=False),
    sa.Column('required', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
    sa.Column('config', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.ForeignKeyConstraint(['survey_id'], ['projects.survey.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['page_id'], ['projects.survey_page.id'], ondelete='CASCADE'),
    schema='projects',
  )
  op.create_index('ix_projects_survey_question_survey_id', 'survey_question', ['survey_id'], schema='projects')
  op.create_index('ix_projects_survey_question_page_id', 'survey_question', ['page_id'], schema='projects')

  op.create_table(
    'survey_question_option',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('question_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('label', sa.String(length=250), nullable=False),
    sa.Column('value', sa.String(length=250), nullable=False),
    sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
    sa.ForeignKeyConstraint(['question_id'], ['projects.survey_question.id'], ondelete='CASCADE'),
    schema='projects',
  )
  op.create_index('ix_projects_survey_question_option_question_id', 'survey_question_option', ['question_id'], schema='projects')


def downgrade () -> None:
  op.drop_index('ix_projects_survey_question_option_question_id', table_name='survey_question_option', schema='projects')
  op.drop_table('survey_question_option', schema='projects')

  op.drop_index('ix_projects_survey_question_page_id', table_name='survey_question', schema='projects')
  op.drop_index('ix_projects_survey_question_survey_id', table_name='survey_question', schema='projects')
  op.drop_table('survey_question', schema='projects')

  op.drop_index('ix_projects_survey_page_survey_id', table_name='survey_page', schema='projects')
  op.drop_table('survey_page', schema='projects')

  op.drop_index('ix_projects_survey_template_key', table_name='survey', schema='projects')
  op.drop_column('survey', 'template_key', schema='projects')

