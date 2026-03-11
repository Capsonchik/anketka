"""add user project access scopes (project + regions)

Revision ID: 0019_user_project_access
Revises: 0018_company_settings
Create Date: 2026-03-11

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0019_user_project_access'
down_revision = '0018_company_settings'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.create_table(
    'user_project_access',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('access_role', sa.String(length=30), nullable=False),
    sa.Column('region_codes', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
    sa.Column('assigned_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.app_user.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['assigned_by_user_id'], ['users.app_user.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['project_id'], ['projects.project.id'], ondelete='CASCADE'),
    sa.UniqueConstraint('user_id', 'project_id', name='uq_projects_user_project_access_user_project'),
    schema='projects',
  )

  op.create_index('ix_projects_user_project_access_user_id', 'user_project_access', ['user_id'], schema='projects')
  op.create_index('ix_projects_user_project_access_project_id', 'user_project_access', ['project_id'], schema='projects')


def downgrade () -> None:
  op.drop_index('ix_projects_user_project_access_project_id', table_name='user_project_access', schema='projects')
  op.drop_index('ix_projects_user_project_access_user_id', table_name='user_project_access', schema='projects')
  op.drop_table('user_project_access', schema='projects')

