"""create projects and reference tables

Revision ID: 0005_projects_refs
Revises: 0004_user_temp_password
Create Date: 2026-03-04

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0005_projects_refs'
down_revision = '0004_user_temp_password'
branch_labels = None
depends_on = None


REGION_SEED: list[dict[str, str]] = [
  {
    "code": "01",
    "name": "Республика Адыгея"
  },
  {
    "code": "02",
    "name": "Республика Башкортостан"
  },
  {
    "code": "03",
    "name": "Республика Бурятия"
  },
  {
    "code": "04",
    "name": "Республика Алтай"
  },
  {
    "code": "05",
    "name": "Республика Дагестан"
  },
  {
    "code": "06",
    "name": "Республика Ингушетия"
  },
  {
    "code": "07",
    "name": "Кабардино-Балкарская Республика"
  },
  {
    "code": "08",
    "name": "Республика Калмыкия"
  },
  {
    "code": "09",
    "name": "Карачаево-Черкесская Республика"
  },
  {
    "code": "10",
    "name": "Республика Карелия"
  },
  {
    "code": "102",
    "name": "Республика Башкортостан"
  },
  {
    "code": "105",
    "name": "Республика Дагестан"
  },
  {
    "code": "11",
    "name": "Республика Коми"
  },
  {
    "code": "113",
    "name": "Республика Мордовия"
  },
  {
    "code": "116",
    "name": "Республика Татарстан"
  },
  {
    "code": "12",
    "name": "Республика Марий Эл"
  },
  {
    "code": "121",
    "name": "Чувашская Республика — Чувашия"
  },
  {
    "code": "122",
    "name": "Алтайский край"
  },
  {
    "code": "123",
    "name": "Краснодарский край"
  },
  {
    "code": "124",
    "name": "Красноярский край"
  },
  {
    "code": "125",
    "name": "Приморский край"
  },
  {
    "code": "126",
    "name": "Ставропольский край"
  },
  {
    "code": "13",
    "name": "Республика Мордовия"
  },
  {
    "code": "131",
    "name": "Белгородская область"
  },
  {
    "code": "133",
    "name": "Владимирская область"
  },
  {
    "code": "134",
    "name": "Волгоградская область"
  },
  {
    "code": "136",
    "name": "Воронежская область"
  },
  {
    "code": "138",
    "name": "Иркутская область"
  },
  {
    "code": "14",
    "name": "Республика Саха"
  },
  {
    "code": "142",
    "name": "Кемеровская область — Кузбасс"
  },
  {
    "code": "147",
    "name": "Ленинградская область"
  },
  {
    "code": "15",
    "name": "Республика Северная Осетия — Алания"
  },
  {
    "code": "150",
    "name": "Московская область"
  },
  {
    "code": "152",
    "name": "Нижегородская область"
  },
  {
    "code": "154",
    "name": "Новосибирская область"
  },
  {
    "code": "155",
    "name": "Омская область"
  },
  {
    "code": "156",
    "name": "Оренбургская область"
  },
  {
    "code": "159",
    "name": "Пермский край"
  },
  {
    "code": "16",
    "name": "Республика Татарстан"
  },
  {
    "code": "161",
    "name": "Ростовская область"
  },
  {
    "code": "163",
    "name": "Самарская область"
  },
  {
    "code": "164",
    "name": "Саратовская область"
  },
  {
    "code": "166",
    "name": "Свердловская область"
  },
  {
    "code": "17",
    "name": "Республика Тыва"
  },
  {
    "code": "172",
    "name": "Тюменская область"
  },
  {
    "code": "173",
    "name": "Ульяновская область"
  },
  {
    "code": "174",
    "name": "Челябинская область"
  },
  {
    "code": "177",
    "name": "Москва"
  },
  {
    "code": "178",
    "name": "Санкт-Петербург"
  },
  {
    "code": "18",
    "name": "Удмуртская Республика"
  },
  {
    "code": "180",
    "name": "Донецкая Народная Республика"
  },
  {
    "code": "181",
    "name": "Луганская Народная Республика"
  },
  {
    "code": "184",
    "name": "Херсонская область"
  },
  {
    "code": "185",
    "name": "Запорожская область"
  },
  {
    "code": "186",
    "name": "Ханты-Мансийский автономный округ — Югра"
  },
  {
    "code": "19",
    "name": "Республика Хакасия"
  },
  {
    "code": "190",
    "name": "Московская область"
  },
  {
    "code": "193",
    "name": "Краснодарский край"
  },
  {
    "code": "196",
    "name": "Свердловская область"
  },
  {
    "code": "197",
    "name": "Москва"
  },
  {
    "code": "198",
    "name": "Санкт-Петербург"
  },
  {
    "code": "199",
    "name": "Москва"
  },
  {
    "code": "20",
    "name": "Чеченская Республика"
  },
  {
    "code": "21",
    "name": "Чувашская Республика — Чувашия"
  },
  {
    "code": "22",
    "name": "Алтайский край"
  },
  {
    "code": "224",
    "name": "Красноярский край"
  },
  {
    "code": "23",
    "name": "Краснодарский край"
  },
  {
    "code": "24",
    "name": "Красноярский край"
  },
  {
    "code": "25",
    "name": "Приморский край"
  },
  {
    "code": "250",
    "name": "Московская область"
  },
  {
    "code": "252",
    "name": "Нижегородская область"
  },
  {
    "code": "26",
    "name": "Ставропольский край"
  },
  {
    "code": "27",
    "name": "Хабаровский край"
  },
  {
    "code": "28",
    "name": "Амурская область"
  },
  {
    "code": "29",
    "name": "Архангельская область"
  },
  {
    "code": "30",
    "name": "Астраханская область"
  },
  {
    "code": "31",
    "name": "Белгородская область"
  },
  {
    "code": "32",
    "name": "Брянская область"
  },
  {
    "code": "323",
    "name": "Краснодарский край"
  },
  {
    "code": "33",
    "name": "Владимирская область"
  },
  {
    "code": "34",
    "name": "Волгоградская область"
  },
  {
    "code": "35",
    "name": "Вологодская область"
  },
  {
    "code": "36",
    "name": "Воронежская область"
  },
  {
    "code": "37",
    "name": "Ивановская область"
  },
  {
    "code": "38",
    "name": "Иркутская область"
  },
  {
    "code": "39",
    "name": "Калининградская область"
  },
  {
    "code": "40",
    "name": "Калужская область"
  },
  {
    "code": "41",
    "name": "Камчатская область"
  },
  {
    "code": "42",
    "name": "Кемеровская область — Кузбасс"
  },
  {
    "code": "43",
    "name": "Кировская область"
  },
  {
    "code": "44",
    "name": "Костромская область"
  },
  {
    "code": "45",
    "name": "Курганская область"
  },
  {
    "code": "46",
    "name": "Курская область"
  },
  {
    "code": "47",
    "name": "Ленинградская область"
  },
  {
    "code": "48",
    "name": "Липецкая область"
  },
  {
    "code": "49",
    "name": "Магаданская область"
  },
  {
    "code": "50",
    "name": "Московская область"
  },
  {
    "code": "51",
    "name": "Мурманская область"
  },
  {
    "code": "52",
    "name": "Нижегородская область"
  },
  {
    "code": "53",
    "name": "Новгородская область"
  },
  {
    "code": "54",
    "name": "Новосибирская область"
  },
  {
    "code": "55",
    "name": "Омская область"
  },
  {
    "code": "550",
    "name": "Московская область"
  },
  {
    "code": "56",
    "name": "Оренбургская область"
  },
  {
    "code": "57",
    "name": "Орловская область"
  },
  {
    "code": "58",
    "name": "Пензенская область"
  },
  {
    "code": "59",
    "name": "Пермская область"
  },
  {
    "code": "60",
    "name": "Псковская область"
  },
  {
    "code": "61",
    "name": "Ростовская область"
  },
  {
    "code": "62",
    "name": "Рязанская область"
  },
  {
    "code": "63",
    "name": "Самарская область"
  },
  {
    "code": "64",
    "name": "Саратовская область"
  },
  {
    "code": "65",
    "name": "Сахалинская область"
  },
  {
    "code": "66",
    "name": "Свердловская область"
  },
  {
    "code": "67",
    "name": "Смоленская область"
  },
  {
    "code": "68",
    "name": "Тамбовская область"
  },
  {
    "code": "69",
    "name": "Тверская область"
  },
  {
    "code": "70",
    "name": "Томская область"
  },
  {
    "code": "702",
    "name": "Республика Башкортостан"
  },
  {
    "code": "71",
    "name": "Тульская область"
  },
  {
    "code": "716",
    "name": "Республика Татарстан"
  },
  {
    "code": "72",
    "name": "Тюменская область"
  },
  {
    "code": "73",
    "name": "Ульяновская область"
  },
  {
    "code": "74",
    "name": "Челябинская область"
  },
  {
    "code": "75",
    "name": "Читинская область"
  },
  {
    "code": "750",
    "name": "Московская область"
  },
  {
    "code": "76",
    "name": "Ярославская область"
  },
  {
    "code": "761",
    "name": "Ростовская область"
  },
  {
    "code": "763",
    "name": "Самарская область"
  },
  {
    "code": "77",
    "name": "Москва"
  },
  {
    "code": "774",
    "name": "Челябинская область"
  },
  {
    "code": "777",
    "name": "Москва"
  },
  {
    "code": "778",
    "name": "Санкт-Петербург"
  },
  {
    "code": "78",
    "name": "Санкт-Петербург"
  },
  {
    "code": "79",
    "name": "Еврейская автономная область"
  },
  {
    "code": "790",
    "name": "Московская область"
  },
  {
    "code": "797",
    "name": "Москва"
  },
  {
    "code": "799",
    "name": "Москва"
  },
  {
    "code": "80",
    "name": "Агинский Бурятский автономный округ"
  },
  {
    "code": "81",
    "name": "Коми-Пермяцкий автономный округ"
  },
  {
    "code": "82",
    "name": "Корякский автономный округ"
  },
  {
    "code": "83",
    "name": "Ненецкий автономный округ"
  },
  {
    "code": "84",
    "name": "Таймырский автономный округ"
  },
  {
    "code": "85",
    "name": "Усть-Ордынский Бурятский автономный округ"
  },
  {
    "code": "86",
    "name": "Ханты-Мансийский автономный округ — Югра"
  },
  {
    "code": "87",
    "name": "Чукотский автономный округ"
  },
  {
    "code": "88",
    "name": "Эвенкийский автономный округ"
  },
  {
    "code": "89",
    "name": "Ямало-Ненецкий автономный округ"
  },
  {
    "code": "90",
    "name": "Московская область"
  },
  {
    "code": "91",
    "name": "Калининградская область"
  },
  {
    "code": "92",
    "name": "Севастополь"
  },
  {
    "code": "93",
    "name": "Краснодарский край"
  },
  {
    "code": "95",
    "name": "Чеченская Республика"
  },
  {
    "code": "96",
    "name": "Свердловская область"
  },
  {
    "code": "97",
    "name": "Москва"
  },
  {
    "code": "977",
    "name": "Москва"
  },
  {
    "code": "98",
    "name": "Санкт-Петербург"
  },
  {
    "code": "99",
    "name": "Москва"
  }
]

CITIES_SEED: list[tuple[str, str]] = [
  ('77', 'Москва'),
  ('78', 'Санкт-Петербург'),
  ('66', 'Екатеринбург'),
  ('23', 'Краснодар'),
  ('54', 'Новосибирск'),
  ('61', 'Ростов-на-Дону'),
  ('23', 'Сочи'),
  ('16', 'Казань'),
  ('52', 'Нижний Новгород'),
  ('63', 'Самара'),
  ('64', 'Саратов'),
  ('74', 'Челябинск'),
  ('50', 'Москва (область)'),
  ('24', 'Красноярск'),
  ('25', 'Владивосток'),
  ('29', 'Архангельск'),
  ('36', 'Воронеж'),
  ('38', 'Иркутск'),
  ('34', 'Волгоград'),
  ('72', 'Тюмень'),
]


def upgrade () -> None:
  op.execute('CREATE SCHEMA IF NOT EXISTS projects')

  op.create_table(
    'ref_region',
    sa.Column('code', sa.String(length=3), primary_key=True, nullable=False),
    sa.Column('name', sa.String(length=250), nullable=False),
    schema='projects',
  )
  op.create_index('ix_projects_ref_region_name', 'ref_region', ['name'], schema='projects')

  op.create_table(
    'ref_city',
    sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True, nullable=False),
    sa.Column('region_code', sa.String(length=3), nullable=False),
    sa.Column('name', sa.String(length=250), nullable=False),
    sa.ForeignKeyConstraint(['region_code'], ['projects.ref_region.code'], ondelete='RESTRICT'),
    sa.UniqueConstraint('region_code', 'name', name='uq_projects_ref_city_region_name'),
    schema='projects',
  )
  op.create_index('ix_projects_ref_city_region_code', 'ref_city', ['region_code'], schema='projects')
  op.create_index('ix_projects_ref_city_name', 'ref_city', ['name'], schema='projects')

  op.create_table(
    'project',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('manager_user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('comment', sa.Text(), nullable=True),
    sa.Column('start_date', sa.Date(), nullable=False),
    sa.Column('end_date', sa.Date(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['company_id'], ['users.company.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['manager_user_id'], ['users.app_user.id'], ondelete='RESTRICT'),
    schema='projects',
  )
  op.create_index('ix_projects_project_company_id', 'project', ['company_id'], schema='projects')
  op.create_index('ix_projects_project_manager_user_id', 'project', ['manager_user_id'], schema='projects')
  op.create_index('ix_projects_project_name', 'project', ['name'], schema='projects')

  bind = op.get_bind()
  for item in REGION_SEED:
    bind.execute(
      sa.text('INSERT INTO projects.ref_region (code, name) VALUES (:code, :name) ON CONFLICT (code) DO NOTHING'),
      {'code': item['code'], 'name': item['name']},
    )

  for region_code, city_name in CITIES_SEED:
    bind.execute(
      sa.text(
        'INSERT INTO projects.ref_city (region_code, name) VALUES (:region_code, :name)'
        ' ON CONFLICT (region_code, name) DO NOTHING',
      ),
      {'region_code': region_code, 'name': city_name},
    )


def downgrade () -> None:
  op.drop_index('ix_projects_project_name', table_name='project', schema='projects')
  op.drop_index('ix_projects_project_manager_user_id', table_name='project', schema='projects')
  op.drop_index('ix_projects_project_company_id', table_name='project', schema='projects')
  op.drop_table('project', schema='projects')

  op.drop_index('ix_projects_ref_city_name', table_name='ref_city', schema='projects')
  op.drop_index('ix_projects_ref_city_region_code', table_name='ref_city', schema='projects')
  op.drop_table('ref_city', schema='projects')

  op.drop_index('ix_projects_ref_region_name', table_name='ref_region', schema='projects')
  op.drop_table('ref_region', schema='projects')

