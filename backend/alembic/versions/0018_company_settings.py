"""add company settings (branding/theme/filters)

Revision ID: 0018_company_settings
Revises: 0017_owner_company_access
Create Date: 2026-03-11

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0018_company_settings'
down_revision = '0017_owner_company_access'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.create_table(
    'company_settings',
    sa.Column('company_id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('category', sa.String(length=120), nullable=True),
    sa.Column('logo_path', sa.Text(), nullable=True),
    sa.Column('background_path', sa.Text(), nullable=True),
    sa.Column('theme', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
    sa.Column('filters', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
    sa.Column('base_ap_project_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['company_id'], ['users.company.id'], ondelete='CASCADE'),
    schema='users',
  )

  op.create_index('ix_users_company_settings_company_id', 'company_settings', ['company_id'], unique=True, schema='users')


def downgrade () -> None:
  op.drop_index('ix_users_company_settings_company_id', table_name='company_settings', schema='users')
  op.drop_table('company_settings', schema='users')

