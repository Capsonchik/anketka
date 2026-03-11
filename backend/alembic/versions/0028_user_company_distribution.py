"""add user_company_distribution (filter values per client)

Revision ID: 0028_user_company_distribution
Revises: 0027_user_company_access
Create Date: 2026-03-11

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0028_user_company_distribution'
down_revision = '0027_user_company_access'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.create_table(
    'user_company_distribution',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('filter_values', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
    sa.Column('updated_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.app_user.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['company_id'], ['users.company.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['updated_by_user_id'], ['users.app_user.id'], ondelete='SET NULL'),
    sa.UniqueConstraint('user_id', 'company_id', name='uq_users_user_company_distribution_user_company'),
    schema='users',
  )
  op.create_index('ix_users_user_company_distribution_user_id', 'user_company_distribution', ['user_id'], schema='users')
  op.create_index('ix_users_user_company_distribution_company_id', 'user_company_distribution', ['company_id'], schema='users')


def downgrade () -> None:
  op.drop_index('ix_users_user_company_distribution_company_id', table_name='user_company_distribution', schema='users')
  op.drop_index('ix_users_user_company_distribution_user_id', table_name='user_company_distribution', schema='users')
  op.drop_table('user_company_distribution', schema='users')

