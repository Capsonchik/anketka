"""add user_company_access (bind user to multiple clients)

Revision ID: 0027_user_company_access
Revises: 0026_shop_point_attrs
Create Date: 2026-03-11

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0027_user_company_access'
down_revision = '0026_shop_point_attrs'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.create_table(
    'user_company_access',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.app_user.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['created_by_user_id'], ['users.app_user.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['company_id'], ['users.company.id'], ondelete='CASCADE'),
    sa.UniqueConstraint('user_id', 'company_id', name='uq_users_user_company_access_user_company'),
    schema='users',
  )
  op.create_index('ix_users_user_company_access_user_id', 'user_company_access', ['user_id'], schema='users')
  op.create_index('ix_users_user_company_access_company_id', 'user_company_access', ['company_id'], schema='users')


def downgrade () -> None:
  op.drop_index('ix_users_user_company_access_company_id', table_name='user_company_access', schema='users')
  op.drop_index('ix_users_user_company_access_user_id', table_name='user_company_access', schema='users')
  op.drop_table('user_company_access', schema='users')

