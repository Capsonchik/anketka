"""survey V2: status, loop_config, scoring, context, attempt state

Revision ID: 0031_survey_v2
Revises: 0030_user_public_id
Create Date: 2026-03-14

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0031_survey_v2'
down_revision = '0030_user_public_id'
branch_labels = None
depends_on = None


def upgrade () -> None:
  # survey: status lifecycle
  op.add_column('survey', sa.Column('status', sa.String(length=24), server_default='created', nullable=False), schema='projects')
  op.add_column('survey', sa.Column('published_at', sa.DateTime(timezone=True), nullable=True), schema='projects')
  op.add_column('survey', sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True), schema='projects')
  op.add_column('survey', sa.Column('version', sa.Integer(), server_default='1', nullable=False), schema='projects')
  op.add_column('survey', sa.Column('context_bindings', postgresql.JSONB(astext_type=sa.Text()), nullable=True), schema='projects')
  op.create_index('ix_projects_survey_status', 'survey', ['status'], schema='projects')

  # survey_page: repeatable sections
  op.add_column('survey_page', sa.Column('section_type', sa.String(length=24), server_default='regular', nullable=False), schema='projects')
  op.add_column('survey_page', sa.Column('loop_config', postgresql.JSONB(astext_type=sa.Text()), nullable=True), schema='projects')

  # survey_question: code, validation, logic, scoring, display, media, analytics_key
  op.add_column('survey_question', sa.Column('code', sa.String(length=64), nullable=True), schema='projects')
  op.add_column('survey_question', sa.Column('description', sa.String(length=500), nullable=True), schema='projects')
  op.add_column('survey_question', sa.Column('validation', postgresql.JSONB(astext_type=sa.Text()), nullable=True), schema='projects')
  op.add_column('survey_question', sa.Column('logic', postgresql.JSONB(astext_type=sa.Text()), nullable=True), schema='projects')
  op.add_column('survey_question', sa.Column('scoring', postgresql.JSONB(astext_type=sa.Text()), nullable=True), schema='projects')
  op.add_column('survey_question', sa.Column('display', postgresql.JSONB(astext_type=sa.Text()), nullable=True), schema='projects')
  op.add_column('survey_question', sa.Column('media', postgresql.JSONB(astext_type=sa.Text()), nullable=True), schema='projects')
  op.add_column('survey_question', sa.Column('analytics_key', sa.String(length=64), nullable=True), schema='projects')
  op.add_column('survey_question', sa.Column('weight', sa.Numeric(precision=10, scale=2), server_default='0', nullable=False), schema='projects')
  op.add_column('survey_question', sa.Column('allow_na', sa.Boolean(), server_default='false', nullable=False), schema='projects')
  op.add_column('survey_question', sa.Column('allow_comment', sa.Boolean(), server_default='false', nullable=False), schema='projects')
  op.add_column('survey_question', sa.Column('dynamic_title_template', sa.String(length=1000), nullable=True), schema='projects')
  op.execute(
    "CREATE UNIQUE INDEX ix_projects_survey_question_code ON projects.survey_question (survey_id, code) WHERE code IS NOT NULL"
  )

  # survey_question_option: points, is_exclusive, is_na
  op.add_column('survey_question_option', sa.Column('points', sa.Numeric(precision=10, scale=2), server_default='0', nullable=False), schema='projects')
  op.add_column('survey_question_option', sa.Column('is_exclusive', sa.Boolean(), server_default='false', nullable=False), schema='projects')
  op.add_column('survey_question_option', sa.Column('is_na', sa.Boolean(), server_default='false', nullable=False), schema='projects')

  # survey_attempt: state, context, score fields
  op.add_column('survey_attempt', sa.Column('state', sa.String(length=24), server_default='submitted', nullable=False), schema='projects')
  op.add_column('survey_attempt', sa.Column('context', postgresql.JSONB(astext_type=sa.Text()), nullable=True), schema='projects')
  op.add_column('survey_attempt', sa.Column('score_total', sa.Numeric(precision=12, scale=2), nullable=True), schema='projects')
  op.add_column('survey_attempt', sa.Column('score_max', sa.Numeric(precision=12, scale=2), nullable=True), schema='projects')
  op.add_column('survey_attempt', sa.Column('score_percent', sa.Numeric(precision=6, scale=2), nullable=True), schema='projects')
  op.add_column('survey_attempt', sa.Column('score_breakdown', postgresql.JSONB(astext_type=sa.Text()), nullable=True), schema='projects')
  op.add_column('survey_attempt', sa.Column('started_at', sa.DateTime(timezone=True), nullable=True), schema='projects')
  op.add_column('survey_attempt', sa.Column('last_saved_at', sa.DateTime(timezone=True), nullable=True), schema='projects')
  op.create_index('ix_projects_survey_attempt_state', 'survey_attempt', ['state'], schema='projects')
  op.create_index('ix_projects_survey_attempt_survey_state', 'survey_attempt', ['survey_id', 'state'], schema='projects')


def downgrade () -> None:
  op.drop_index('ix_projects_survey_attempt_survey_state', table_name='survey_attempt', schema='projects')
  op.drop_index('ix_projects_survey_attempt_state', table_name='survey_attempt', schema='projects')
  op.drop_column('survey_attempt', 'last_saved_at', schema='projects')
  op.drop_column('survey_attempt', 'started_at', schema='projects')
  op.drop_column('survey_attempt', 'score_breakdown', schema='projects')
  op.drop_column('survey_attempt', 'score_percent', schema='projects')
  op.drop_column('survey_attempt', 'score_max', schema='projects')
  op.drop_column('survey_attempt', 'score_total', schema='projects')
  op.drop_column('survey_attempt', 'context', schema='projects')
  op.drop_column('survey_attempt', 'state', schema='projects')

  op.execute('DROP INDEX IF EXISTS projects.ix_projects_survey_question_code')
  op.drop_column('survey_question', 'dynamic_title_template', schema='projects')
  op.drop_column('survey_question', 'allow_comment', schema='projects')
  op.drop_column('survey_question', 'allow_na', schema='projects')
  op.drop_column('survey_question', 'weight', schema='projects')
  op.drop_column('survey_question', 'analytics_key', schema='projects')
  op.drop_column('survey_question', 'media', schema='projects')
  op.drop_column('survey_question', 'display', schema='projects')
  op.drop_column('survey_question', 'scoring', schema='projects')
  op.drop_column('survey_question', 'logic', schema='projects')
  op.drop_column('survey_question', 'validation', schema='projects')
  op.drop_column('survey_question', 'description', schema='projects')
  op.drop_column('survey_question', 'code', schema='projects')

  op.drop_column('survey_page', 'loop_config', schema='projects')
  op.drop_column('survey_page', 'section_type', schema='projects')

  op.drop_index('ix_projects_survey_status', table_name='survey', schema='projects')
  op.drop_column('survey', 'context_bindings', schema='projects')
  op.drop_column('survey', 'version', schema='projects')
  op.drop_column('survey', 'archived_at', schema='projects')
  op.drop_column('survey', 'published_at', schema='projects')
  op.drop_column('survey', 'status', schema='projects')

  op.drop_column('survey_question_option', 'is_na', schema='projects')
  op.drop_column('survey_question_option', 'is_exclusive', schema='projects')
  op.drop_column('survey_question_option', 'points', schema='projects')
