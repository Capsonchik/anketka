"""bootstrap platform owners for default emails

Revision ID: 0022_bootstrap_owners
Revises: 0021_user_profile_fields
Create Date: 2026-03-11

"""

from uuid import uuid4

from alembic import op
import sqlalchemy as sa


revision = '0022_bootstrap_owners'
down_revision = '0021_user_profile_fields'
branch_labels = None
depends_on = None


OWNER_EMAILS = ('admin@admin.ru', 'dima@admin.ru')


def upgrade () -> None:
  conn = op.get_bind()

  conn.execute(
    sa.text(
      """
      UPDATE users.app_user
      SET platform_role = 'owner'
      WHERE lower(email) = ANY(:emails)
      """,
    ),
    {'emails': [e.lower() for e in OWNER_EMAILS]},
  )

  rows = conn.execute(
    sa.text(
      """
      SELECT id, company_id
      FROM users.app_user
      WHERE lower(email) = ANY(:emails)
      """,
    ),
    {'emails': [e.lower() for e in OWNER_EMAILS]},
  ).fetchall()

  for user_id, company_id in rows:
    conn.execute(
      sa.text(
        """
        INSERT INTO users.owner_company_access (id, owner_user_id, company_id, created_at)
        VALUES (:id, :owner_user_id, :company_id, now())
        ON CONFLICT (owner_user_id, company_id) DO NOTHING
        """,
      ),
      {
        'id': str(uuid4()),
        'owner_user_id': str(user_id),
        'company_id': str(company_id),
      },
    )


def downgrade () -> None:
  conn = op.get_bind()

  # remove owner->company grants for these emails
  conn.execute(
    sa.text(
      """
      DELETE FROM users.owner_company_access oca
      USING users.app_user u
      WHERE oca.owner_user_id = u.id
        AND lower(u.email) = ANY(:emails)
      """,
    ),
    {'emails': [e.lower() for e in OWNER_EMAILS]},
  )

  conn.execute(
    sa.text(
      """
      UPDATE users.app_user
      SET platform_role = 'user'
      WHERE lower(email) = ANY(:emails)
      """,
    ),
    {'emails': [e.lower() for e in OWNER_EMAILS]},
  )

