"""add user profile fields (active/lang/company/last_login)

Revision ID: 0021_user_profile_fields
Revises: 0020_user_point_access
Create Date: 2026-03-11

"""

from alembic import op
import sqlalchemy as sa


revision = '0021_user_profile_fields'
down_revision = '0020_user_point_access'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.add_column(
    'app_user',
    sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
    schema='users',
  )
  op.add_column(
    'app_user',
    sa.Column('ui_language', sa.String(length=12), server_default='ru', nullable=False),
    schema='users',
  )
  op.add_column(
    'app_user',
    sa.Column('profile_company', sa.String(length=250), nullable=True),
    schema='users',
  )
  op.add_column(
    'app_user',
    sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
    schema='users',
  )

  op.create_index('ix_users_app_user_is_active', 'app_user', ['is_active'], schema='users')
  op.create_index('ix_users_app_user_ui_language', 'app_user', ['ui_language'], schema='users')
  op.create_index('ix_users_app_user_last_login_at', 'app_user', ['last_login_at'], schema='users')


def downgrade () -> None:
  op.drop_index('ix_users_app_user_last_login_at', table_name='app_user', schema='users')
  op.drop_index('ix_users_app_user_ui_language', table_name='app_user', schema='users')
  op.drop_index('ix_users_app_user_is_active', table_name='app_user', schema='users')

  op.drop_column('app_user', 'last_login_at', schema='users')
  op.drop_column('app_user', 'profile_company', schema='users')
  op.drop_column('app_user', 'ui_language', schema='users')
  op.drop_column('app_user', 'is_active', schema='users')

