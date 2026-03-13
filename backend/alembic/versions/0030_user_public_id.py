"""add public_id for users

Revision ID: 0030_user_public_id
Revises: 0029_user_company_reports
Create Date: 2026-03-13

"""

from alembic import op
import sqlalchemy as sa


revision = '0030_user_public_id'
down_revision = '0029_user_company_reports'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.execute("CREATE SEQUENCE IF NOT EXISTS users.app_user_public_id_seq START WITH 100001 INCREMENT BY 1")
  op.add_column('app_user', sa.Column('public_id', sa.BigInteger(), nullable=True), schema='users')
  op.execute("ALTER TABLE users.app_user ALTER COLUMN public_id SET DEFAULT nextval('users.app_user_public_id_seq'::regclass)")
  op.execute("UPDATE users.app_user SET public_id = nextval('users.app_user_public_id_seq'::regclass) WHERE public_id IS NULL")
  op.alter_column('app_user', 'public_id', nullable=False, schema='users')
  op.create_index('ix_users_app_user_public_id', 'app_user', ['public_id'], unique=True, schema='users')


def downgrade () -> None:
  op.drop_index('ix_users_app_user_public_id', table_name='app_user', schema='users')
  op.drop_column('app_user', 'public_id', schema='users')
  op.execute('DROP SEQUENCE IF EXISTS users.app_user_public_id_seq')
