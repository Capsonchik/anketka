"""add user groups and memberships

Revision ID: 0024_user_groups
Revises: 0023_user_permissions
Create Date: 2026-03-11

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0024_user_groups'
down_revision = '0023_user_permissions'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.create_table(
    'user_group',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['company_id'], ['users.company.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['created_by_user_id'], ['users.app_user.id'], ondelete='SET NULL'),
    sa.UniqueConstraint('company_id', 'name', name='uq_users_user_group_company_name'),
    schema='users',
  )
  op.create_index('ix_users_user_group_company_id', 'user_group', ['company_id'], schema='users')

  op.create_table(
    'user_group_member',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('group_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['group_id'], ['users.user_group.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.app_user.id'], ondelete='CASCADE'),
    sa.UniqueConstraint('group_id', 'user_id', name='uq_users_user_group_member_group_user'),
    schema='users',
  )
  op.create_index('ix_users_user_group_member_group_id', 'user_group_member', ['group_id'], schema='users')
  op.create_index('ix_users_user_group_member_user_id', 'user_group_member', ['user_id'], schema='users')


def downgrade () -> None:
  op.drop_index('ix_users_user_group_member_user_id', table_name='user_group_member', schema='users')
  op.drop_index('ix_users_user_group_member_group_id', table_name='user_group_member', schema='users')
  op.drop_table('user_group_member', schema='users')

  op.drop_index('ix_users_user_group_company_id', table_name='user_group', schema='users')
  op.drop_table('user_group', schema='users')

