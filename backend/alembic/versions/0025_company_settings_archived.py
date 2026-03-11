"""add company settings is_archived

Revision ID: 0025_company_settings_archived
Revises: 0024_user_groups
Create Date: 2026-03-11

"""

from alembic import op
import sqlalchemy as sa


revision = '0025_company_settings_archived'
down_revision = '0024_user_groups'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.add_column(
    'company_settings',
    sa.Column('is_archived', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    schema='users',
  )
  op.create_index('ix_users_company_settings_is_archived', 'company_settings', ['is_archived'], schema='users')


def downgrade () -> None:
  op.drop_index('ix_users_company_settings_is_archived', table_name='company_settings', schema='users')
  op.drop_column('company_settings', 'is_archived', schema='users')

