"""add category to survey

Revision ID: 0008_survey_category
Revises: 0007_surveys
Create Date: 2026-03-07

"""

from alembic import op
import sqlalchemy as sa


revision = '0008_survey_category'
down_revision = '0007_surveys'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.add_column('survey', sa.Column('category', sa.String(length=32), server_default='price_monitoring', nullable=False), schema='projects')
  op.create_index('ix_projects_survey_category', 'survey', ['category'], schema='projects')


def downgrade () -> None:
  op.drop_index('ix_projects_survey_category', table_name='survey', schema='projects')
  op.drop_column('survey', 'category', schema='projects')

