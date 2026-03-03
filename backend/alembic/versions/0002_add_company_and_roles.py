"""add company and user roles

Revision ID: 0002_company_roles
Revises: 0001_create_users
Create Date: 2026-03-03

"""

from uuid import uuid4

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0002_company_roles'
down_revision = '0001_create_users'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.execute(
    """
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'user_role' AND n.nspname = 'users'
  ) THEN
    CREATE TYPE users.user_role AS ENUM ('admin', 'coordinator', 'manager');
  END IF;
END
$$;
""",
  )

  op.create_table(
    'company',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.UniqueConstraint('name', name='uq_users_company_name'),
    schema='users',
  )
  op.create_index('ix_users_company_name', 'company', ['name'], unique=True, schema='users')

  op.add_column(
    'app_user',
    sa.Column(
      'role',
      sa.Enum('admin', 'coordinator', 'manager', name='user_role', schema='users'),
      server_default='admin',
      nullable=False,
    ),
    schema='users',
  )

  op.add_column(
    'app_user',
    sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
    schema='users',
  )
  op.create_index('ix_users_app_user_company_id', 'app_user', ['company_id'], schema='users')

  bind = op.get_bind()
  rows = bind.execute(sa.text("SELECT DISTINCT organization FROM users.app_user WHERE organization IS NOT NULL AND organization <> ''"))
  organizations = [r[0] for r in rows.fetchall()]

  for name in organizations:
    bind.execute(
      sa.text('INSERT INTO users.company (id, name) VALUES (:id, :name) ON CONFLICT (name) DO NOTHING'),
      {'id': uuid4(), 'name': name},
    )

  bind.execute(
    sa.text(
      """
UPDATE users.app_user u
SET company_id = c.id
FROM users.company c
WHERE u.organization = c.name
""",
    ),
  )

  default_company_name = 'Без компании'
  bind.execute(
    sa.text('INSERT INTO users.company (id, name) VALUES (:id, :name) ON CONFLICT (name) DO NOTHING'),
    {'id': uuid4(), 'name': default_company_name},
  )
  bind.execute(
    sa.text(
      """
UPDATE users.app_user u
SET company_id = (SELECT id FROM users.company WHERE name = :name)
WHERE u.company_id IS NULL
""",
    ),
    {'name': default_company_name},
  )

  op.alter_column('app_user', 'company_id', nullable=False, schema='users')
  op.create_foreign_key(
    'fk_users_app_user_company_id',
    source_table='app_user',
    referent_table='company',
    local_cols=['company_id'],
    remote_cols=['id'],
    source_schema='users',
    referent_schema='users',
    ondelete='RESTRICT',
  )

  op.drop_column('app_user', 'organization', schema='users')


def downgrade () -> None:
  op.add_column('app_user', sa.Column('organization', sa.String(length=200), nullable=True), schema='users')

  bind = op.get_bind()
  bind.execute(
    sa.text(
      """
UPDATE users.app_user u
SET organization = c.name
FROM users.company c
WHERE u.company_id = c.id
""",
    ),
  )

  op.drop_constraint('fk_users_app_user_company_id', 'app_user', schema='users', type_='foreignkey')
  op.drop_index('ix_users_app_user_company_id', table_name='app_user', schema='users')
  op.drop_column('app_user', 'company_id', schema='users')

  op.drop_column('app_user', 'role', schema='users')

  op.drop_index('ix_users_company_name', table_name='company', schema='users')
  op.drop_table('company', schema='users')

  op.execute('DROP TYPE IF EXISTS users.user_role')

