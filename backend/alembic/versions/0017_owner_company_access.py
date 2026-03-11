"""add platform role + owner access to companies

Revision ID: 0017_owner_company_access
Revises: 0016_normalize_region_codes
Create Date: 2026-03-11

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0017_owner_company_access'
down_revision = '0016_normalize_region_codes'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.add_column(
    'app_user',
    sa.Column('platform_role', sa.String(length=20), server_default='user', nullable=False),
    schema='users',
  )

  op.create_table(
    'owner_company_access',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('owner_user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['owner_user_id'], ['users.app_user.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['company_id'], ['users.company.id'], ondelete='CASCADE'),
    sa.UniqueConstraint('owner_user_id', 'company_id', name='uq_users_owner_company_access_owner_company'),
    schema='users',
  )

  op.create_index(
    'ix_users_owner_company_access_owner_user_id',
    'owner_company_access',
    ['owner_user_id'],
    schema='users',
  )
  op.create_index(
    'ix_users_owner_company_access_company_id',
    'owner_company_access',
    ['company_id'],
    schema='users',
  )


def downgrade () -> None:
  op.drop_index('ix_users_owner_company_access_company_id', table_name='owner_company_access', schema='users')
  op.drop_index('ix_users_owner_company_access_owner_user_id', table_name='owner_company_access', schema='users')
  op.drop_table('owner_company_access', schema='users')

  op.drop_column('app_user', 'platform_role', schema='users')

