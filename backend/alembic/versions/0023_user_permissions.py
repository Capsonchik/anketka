"""add user permissions (security groups) jsonb

Revision ID: 0023_user_permissions
Revises: 0022_bootstrap_owners
Create Date: 2026-03-11

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0023_user_permissions'
down_revision = '0022_bootstrap_owners'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.add_column(
    'app_user',
    sa.Column('permissions', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
    schema='users',
  )


def downgrade () -> None:
  op.drop_column('app_user', 'permissions', schema='users')

