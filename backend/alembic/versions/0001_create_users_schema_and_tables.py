"""create users schema and auth tables

Revision ID: 0001_create_users
Revises: None
Create Date: 2026-03-01

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0001_create_users'
down_revision = None
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.execute('CREATE SCHEMA IF NOT EXISTS users')

  op.create_table(
    'app_user',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('first_name', sa.String(length=120), nullable=False),
    sa.Column('last_name', sa.String(length=120), nullable=False),
    sa.Column('organization', sa.String(length=200), nullable=True),
    sa.Column('email', sa.String(length=320), nullable=False),
    sa.Column('phone', sa.String(length=32), nullable=False),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.UniqueConstraint('email', name='uq_users_app_user_email'),
    sa.UniqueConstraint('phone', name='uq_users_app_user_phone'),
    schema='users',
  )

  op.create_index('ix_users_app_user_email', 'app_user', ['email'], unique=True, schema='users')
  op.create_index('ix_users_app_user_phone', 'app_user', ['phone'], unique=True, schema='users')

  op.create_table(
    'refresh_token',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('jti', sa.String(length=64), nullable=False),
    sa.Column('token_hash', sa.String(length=64), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.app_user.id'], ondelete='CASCADE'),
    sa.UniqueConstraint('jti', name='uq_users_refresh_token_jti'),
    sa.UniqueConstraint('token_hash', name='uq_users_refresh_token_hash'),
    schema='users',
  )

  op.create_index('ix_users_refresh_token_user_id', 'refresh_token', ['user_id'], schema='users')
  op.create_index('ix_users_refresh_token_jti', 'refresh_token', ['jti'], unique=True, schema='users')
  op.create_index('ix_users_refresh_token_hash', 'refresh_token', ['token_hash'], unique=True, schema='users')


def downgrade () -> None:
  op.drop_index('ix_users_refresh_token_hash', table_name='refresh_token', schema='users')
  op.drop_index('ix_users_refresh_token_jti', table_name='refresh_token', schema='users')
  op.drop_index('ix_users_refresh_token_user_id', table_name='refresh_token', schema='users')
  op.drop_table('refresh_token', schema='users')

  op.drop_index('ix_users_app_user_phone', table_name='app_user', schema='users')
  op.drop_index('ix_users_app_user_email', table_name='app_user', schema='users')
  op.drop_table('app_user', schema='users')

