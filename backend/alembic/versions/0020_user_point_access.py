"""add user point access bindings (user <-> shop_point)

Revision ID: 0020_user_point_access
Revises: 0019_user_project_access
Create Date: 2026-03-11

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0020_user_point_access'
down_revision = '0019_user_project_access'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.create_table(
    'user_point_access',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('point_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('assigned_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.app_user.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['assigned_by_user_id'], ['users.app_user.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['point_id'], ['projects.shop_point.id'], ondelete='CASCADE'),
    sa.UniqueConstraint('user_id', 'point_id', name='uq_projects_user_point_access_user_point'),
    schema='projects',
  )

  op.create_index('ix_projects_user_point_access_user_id', 'user_point_access', ['user_id'], schema='projects')
  op.create_index('ix_projects_user_point_access_point_id', 'user_point_access', ['point_id'], schema='projects')


def downgrade () -> None:
  op.drop_index('ix_projects_user_point_access_point_id', table_name='user_point_access', schema='projects')
  op.drop_index('ix_projects_user_point_access_user_id', table_name='user_point_access', schema='projects')
  op.drop_table('user_point_access', schema='projects')

