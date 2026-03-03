"""add user note and make phone optional

Revision ID: 0003_user_note_phone
Revises: 0002_company_roles
Create Date: 2026-03-03

"""

from alembic import op
import sqlalchemy as sa


revision = '0003_user_note_phone'
down_revision = '0002_company_roles'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.add_column('app_user', sa.Column('note', sa.Text(), nullable=True), schema='users')
  op.alter_column('app_user', 'phone', existing_type=sa.String(length=32), nullable=True, schema='users')


def downgrade () -> None:
  op.alter_column('app_user', 'phone', existing_type=sa.String(length=32), nullable=False, schema='users')
  op.drop_column('app_user', 'note', schema='users')

