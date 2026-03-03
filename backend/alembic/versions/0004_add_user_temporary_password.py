"""add temporary password field (prototype)

Revision ID: 0004_user_temp_password
Revises: 0003_user_note_phone
Create Date: 2026-03-03

"""

from alembic import op
import sqlalchemy as sa


revision = '0004_user_temp_password'
down_revision = '0003_user_note_phone'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.add_column('app_user', sa.Column('temporary_password', sa.Text(), nullable=True), schema='users')


def downgrade () -> None:
  op.drop_column('app_user', 'temporary_password', schema='users')

