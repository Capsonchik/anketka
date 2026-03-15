"""add public_id for auditors

Revision ID: 0032_auditor_public_id
Revises: 0031_survey_v2
Create Date: 2026-03-15

"""

from alembic import op
import sqlalchemy as sa


revision = '0032_auditor_public_id'
down_revision = '0031_survey_v2'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.execute("CREATE SEQUENCE IF NOT EXISTS projects.auditor_public_id_seq START WITH 100001 INCREMENT BY 1")
  op.add_column('auditor', sa.Column('public_id', sa.BigInteger(), nullable=True), schema='projects')
  op.execute("ALTER TABLE projects.auditor ALTER COLUMN public_id SET DEFAULT nextval('projects.auditor_public_id_seq'::regclass)")
  op.execute("UPDATE projects.auditor SET public_id = nextval('projects.auditor_public_id_seq'::regclass) WHERE public_id IS NULL")
  op.alter_column('auditor', 'public_id', nullable=False, schema='projects')
  op.create_index('ix_projects_auditor_public_id', 'auditor', ['public_id'], unique=True, schema='projects')


def downgrade () -> None:
  op.drop_index('ix_projects_auditor_public_id', table_name='auditor', schema='projects')
  op.drop_column('auditor', 'public_id', schema='projects')
  op.execute('DROP SEQUENCE IF EXISTS projects.auditor_public_id_seq')
