"""project_survey_auditor assigned_by_user_id

Revision ID: 0011_assigned_by
Revises: 0010_auditors_assignments
Create Date: 2026-03-08

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0011_assigned_by'
down_revision = '0010_auditors_assignments'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.add_column(
    'project_survey_auditor',
    sa.Column('assigned_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
    schema='projects',
  )
  op.create_index(
    'ix_projects_project_survey_auditor_assigned_by_user_id',
    'project_survey_auditor',
    ['assigned_by_user_id'],
    schema='projects',
  )
  op.create_foreign_key(
    'fk_psa_assigned_by_user',
    source_table='project_survey_auditor',
    referent_table='app_user',
    local_cols=['assigned_by_user_id'],
    remote_cols=['id'],
    source_schema='projects',
    referent_schema='users',
    ondelete='RESTRICT',
  )


def downgrade () -> None:
  op.drop_constraint(
    'fk_psa_assigned_by_user',
    'project_survey_auditor',
    schema='projects',
    type_='foreignkey',
  )
  op.drop_index(
    'ix_projects_project_survey_auditor_assigned_by_user_id',
    table_name='project_survey_auditor',
    schema='projects',
  )
  op.drop_column('project_survey_auditor', 'assigned_by_user_id', schema='projects')

