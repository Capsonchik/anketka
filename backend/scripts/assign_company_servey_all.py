import asyncio
import sys
from pathlib import Path

from sqlalchemy import select, update

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.db.session import async_session
from app.models.company import Company
from app.models.user import User


COMPANY_NAME = 'SERVEY-ALL'


async def run () -> None:
  async with async_session() as db:
    res = await db.execute(select(Company).where(Company.name == COMPANY_NAME))
    company = res.scalar_one_or_none()
    created = False

    if company is None:
      company = Company(name=COMPANY_NAME)
      db.add(company)
      await db.flush()
      created = True

    users_res = await db.execute(select(User.id, User.email, User.company_id))
    users = users_res.all()
    if not users:
      raise SystemExit('В БД нет пользователей — нечего присваивать компании')

    await db.execute(update(User).values(company_id=company.id))
    await db.commit()

    status = 'created' if created else 'exists'
    print(f'Company: {company.name} ({company.id}) [{status}]')
    print(f'Users updated: {len(users)}')
    for u in users:
      print(f'- {u.email}')


def main () -> None:
  asyncio.run(run())


if __name__ == '__main__':
  main()

