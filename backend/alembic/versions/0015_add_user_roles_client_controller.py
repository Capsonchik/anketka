"""add user roles: client + controller

Revision ID: 0015_user_roles_client_ctrl
Revises: 0014_auditor_portal
Create Date: 2026-03-09

"""

from alembic import op


revision = '0015_user_roles_client_ctrl'
down_revision = '0014_auditor_portal'
branch_labels = None
depends_on = None


def upgrade () -> None:
  # ALTER TYPE .. ADD VALUE historically had transaction limitations in Postgres,
  # so we run it in an autocommit block for maximum compatibility.
  with op.get_context().autocommit_block():
    op.execute(
      """
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'user_role' AND n.nspname = 'users'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'user_role' AND n.nspname = 'users' AND e.enumlabel = 'client'
    ) THEN
      EXECUTE 'ALTER TYPE users.user_role ADD VALUE ''client''';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'user_role' AND n.nspname = 'users' AND e.enumlabel = 'controller'
    ) THEN
      EXECUTE 'ALTER TYPE users.user_role ADD VALUE ''controller''';
    END IF;
  END IF;
END
$$;
""",
    )


def downgrade () -> None:
  # Dropping enum values in Postgres is non-trivial and unsafe for downgrade.
  # We keep this downgrade as a no-op.
  return None

