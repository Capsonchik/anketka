"""add shop_point attrs jsonb

Revision ID: 0026_shop_point_attrs
Revises: 0025_company_settings_archived
Create Date: 2026-03-11

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0026_shop_point_attrs'
down_revision = '0025_company_settings_archived'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.add_column(
    'shop_point',
    sa.Column('attrs', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
    schema='projects',
  )


def downgrade () -> None:
  op.drop_column('shop_point', 'attrs', schema='projects')

