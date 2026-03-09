"""normalize region codes to subject codes (01-95)

Fixes legacy reference data where region codes were seeded as vehicle plate codes
(e.g. 99/177/777 for Moscow, 93 for Krasnodar, 90 for Moscow oblast, etc).

Revision ID: 0016_normalize_region_codes
Revises: 0015_user_roles_client_controller
Create Date: 2026-03-09

"""

from alembic import op
import sqlalchemy as sa


revision = '0016_normalize_region_codes'
down_revision = '0015_user_roles_client_controller'
branch_labels = None
depends_on = None


OFFICIAL_REGIONS: list[dict[str, str]] = [
  {'code': '01', 'name': 'Республика Адыгея (Адыгея)'},
  {'code': '02', 'name': 'Республика Башкортостан'},
  {'code': '03', 'name': 'Республика Бурятия'},
  {'code': '04', 'name': 'Республика Алтай'},
  {'code': '05', 'name': 'Республика Дагестан'},
  {'code': '06', 'name': 'Республика Ингушетия'},
  {'code': '07', 'name': 'Кабардино-Балкарская Республика'},
  {'code': '08', 'name': 'Республика Калмыкия'},
  {'code': '09', 'name': 'Карачаево-Черкесская Республика'},
  {'code': '10', 'name': 'Республика Карелия'},
  {'code': '11', 'name': 'Республика Коми'},
  {'code': '12', 'name': 'Республика Марий Эл'},
  {'code': '13', 'name': 'Республика Мордовия'},
  {'code': '14', 'name': 'Республика Саха (Якутия)'},
  {'code': '15', 'name': 'Республика Северная Осетия - Алания'},
  {'code': '16', 'name': 'Республика Татарстан (Татарстан)'},
  {'code': '17', 'name': 'Республика Тыва'},
  {'code': '18', 'name': 'Удмуртская Республика'},
  {'code': '19', 'name': 'Республика Хакасия'},
  {'code': '20', 'name': 'Чеченская Республика'},
  {'code': '21', 'name': 'Чувашская Республика - Чувашия'},
  {'code': '22', 'name': 'Алтайский край'},
  {'code': '23', 'name': 'Краснодарский край'},
  {'code': '24', 'name': 'Красноярский край'},
  {'code': '25', 'name': 'Приморский край'},
  {'code': '26', 'name': 'Ставропольский край'},
  {'code': '27', 'name': 'Хабаровский край'},
  {'code': '28', 'name': 'Амурская область'},
  {'code': '29', 'name': 'Архангельская область'},
  {'code': '30', 'name': 'Астраханская область'},
  {'code': '31', 'name': 'Белгородская область'},
  {'code': '32', 'name': 'Брянская область'},
  {'code': '33', 'name': 'Владимирская область'},
  {'code': '34', 'name': 'Волгоградская область'},
  {'code': '35', 'name': 'Вологодская область'},
  {'code': '36', 'name': 'Воронежская область'},
  {'code': '37', 'name': 'Ивановская область'},
  {'code': '38', 'name': 'Иркутская область'},
  {'code': '39', 'name': 'Калининградская область'},
  {'code': '40', 'name': 'Калужская область'},
  {'code': '41', 'name': 'Камчатский край'},
  {'code': '42', 'name': 'Кемеровская область - Кузбасс'},
  {'code': '43', 'name': 'Кировская область'},
  {'code': '44', 'name': 'Костромская область'},
  {'code': '45', 'name': 'Курганская область'},
  {'code': '46', 'name': 'Курская область'},
  {'code': '47', 'name': 'Ленинградская область'},
  {'code': '48', 'name': 'Липецкая область'},
  {'code': '49', 'name': 'Магаданская область'},
  {'code': '50', 'name': 'Московская область'},
  {'code': '51', 'name': 'Мурманская область'},
  {'code': '52', 'name': 'Нижегородская область'},
  {'code': '53', 'name': 'Новгородская область'},
  {'code': '54', 'name': 'Новосибирская область'},
  {'code': '55', 'name': 'Омская область'},
  {'code': '56', 'name': 'Оренбургская область'},
  {'code': '57', 'name': 'Орловская область'},
  {'code': '58', 'name': 'Пензенская область'},
  {'code': '59', 'name': 'Пермский край'},
  {'code': '60', 'name': 'Псковская область'},
  {'code': '61', 'name': 'Ростовская область'},
  {'code': '62', 'name': 'Рязанская область'},
  {'code': '63', 'name': 'Самарская область'},
  {'code': '64', 'name': 'Саратовская область'},
  {'code': '65', 'name': 'Сахалинская область'},
  {'code': '66', 'name': 'Свердловская область'},
  {'code': '67', 'name': 'Смоленская область'},
  {'code': '68', 'name': 'Тамбовская область'},
  {'code': '69', 'name': 'Тверская область'},
  {'code': '70', 'name': 'Томская область'},
  {'code': '71', 'name': 'Тульская область'},
  {'code': '72', 'name': 'Тюменская область'},
  {'code': '73', 'name': 'Ульяновская область'},
  {'code': '74', 'name': 'Челябинская область'},
  {'code': '75', 'name': 'Забайкальский край'},
  {'code': '76', 'name': 'Ярославская область'},
  {'code': '77', 'name': 'г. Москва'},
  {'code': '78', 'name': 'г. Санкт-Петербург'},
  {'code': '79', 'name': 'Еврейская автономная область'},
  {'code': '83', 'name': 'Ненецкий автономный округ'},
  {'code': '86', 'name': 'Ханты-Мансийский автономный округ - Югра'},
  {'code': '87', 'name': 'Чукотский автономный округ'},
  {'code': '89', 'name': 'Ямало-Ненецкий автономный округ'},
  {'code': '90', 'name': 'Запорожская область'},
  {'code': '91', 'name': 'Республика Крым'},
  {'code': '92', 'name': 'г. Севастополь'},
  {'code': '93', 'name': 'Донецкая Народная Республика'},
  {'code': '94', 'name': 'Луганская Народная Республика'},
  {'code': '95', 'name': 'Херсонская область'},
]


def upgrade () -> None:
  bind = op.get_bind()

  official_codes = [x['code'] for x in OFFICIAL_REGIONS]

  # Ensure all official regions exist + refresh names
  for item in OFFICIAL_REGIONS:
    bind.execute(
      sa.text(
        """
INSERT INTO projects.ref_region (code, name)
VALUES (:code, :name)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
""",
      ),
      {'code': item['code'], 'name': item['name']},
    )

  # We will normalize region codes in ref_city; to avoid conflicts during update
  # we temporarily drop the unique constraint and re-create it after dedupe.
  op.drop_constraint('uq_projects_ref_city_region_name', 'ref_city', schema='projects', type_='unique')

  # Explicit remaps for known conflicts and historical/plate codes.
  # These must run before the generic "right(code,2)" rule.
  explicit_map: dict[str, str] = {
    # Moscow and SPB multi-codes
    '97': '77',
    '99': '77',
    '177': '77',
    '197': '77',
    '199': '77',
    '777': '77',
    '797': '77',
    '799': '77',
    '977': '77',
    '98': '78',
    '178': '78',
    '198': '78',
    '778': '78',

    # Moscow oblast "plate codes" and legacy seed mistake (90)
    '90': '50',
    '150': '50',
    '190': '50',
    '250': '50',
    '550': '50',
    '750': '50',
    '790': '50',

    # Seed mistakes where codes were reused (need to free official 90-95)
    '91': '39',  # was Kaliningrad in legacy seed
    '93': '23',  # was Krasnodar in legacy seed
    '95': '20',  # was Chechnya in legacy seed

    # Donetsk/Luhansk/Kherson/Zaporizhzhia were stored as 180/181/184/185 in legacy seed
    '180': '93',
    '181': '94',
    '184': '95',
    '185': '90',

    # HMAO had plate code 186 in legacy seed
    '186': '86',

    # Obsolete autonomous okrugs -> current parent regions (so we don't lose cities/points)
    '80': '75',  # Агинский Бурятский АО -> Забайкальский край
    '81': '59',  # Коми-Пермяцкий АО -> Пермский край
    '82': '41',  # Корякский АО -> Камчатский край
    '84': '24',  # Таймырский АО -> Красноярский край
    '85': '38',  # Усть-Ордынский Бурятский АО -> Иркутская область
    '88': '24',  # Эвенкийский АО -> Красноярский край
  }

  def apply_explicit_map (table: str, col: str) -> None:
    for old, new in explicit_map.items():
      bind.execute(sa.text(f'UPDATE projects.{table} SET {col} = :new WHERE {col} = :old'), {'old': old, 'new': new})

  apply_explicit_map('ref_city', 'region_code')
  apply_explicit_map('shop_point', 'region_code')

  # Generic normalization for 3-digit plate codes (e.g. 102->02, 774->74, 702->02, 716->16, etc).
  # We only apply it when the derived code exists in the official list.
  codes_param = sa.bindparam('codes', expanding=True)
  bind.execute(
    sa.text(
      """
UPDATE projects.ref_city
SET region_code = right(region_code, 2)
WHERE
  region_code IS NOT NULL
  AND length(region_code) = 3
  AND right(region_code, 2) IN :codes
  AND region_code NOT IN :codes
""",
    ).bindparams(codes_param),
    {'codes': official_codes},
  )
  bind.execute(
    sa.text(
      """
UPDATE projects.shop_point
SET region_code = right(region_code, 2)
WHERE
  region_code IS NOT NULL
  AND length(region_code) = 3
  AND right(region_code, 2) IN :codes
  AND region_code NOT IN :codes
""",
    ).bindparams(codes_param),
    {'codes': official_codes},
  )

  # Deduplicate cities after normalization: keep minimal id per (region_code, name)
  bind.execute(
    sa.text(
      """
DELETE FROM projects.ref_city c
USING projects.ref_city d
WHERE
  c.region_code = d.region_code
  AND c.name = d.name
  AND c.id > d.id
""",
    ),
  )

  op.create_unique_constraint(
    'uq_projects_ref_city_region_name',
    'ref_city',
    ['region_code', 'name'],
    schema='projects',
  )

  # Remove non-official regions that are no longer referenced by cities
  bind.execute(
    sa.text(
      """
DELETE FROM projects.ref_region r
WHERE
  r.code NOT IN :codes
  AND NOT EXISTS (SELECT 1 FROM projects.ref_city c WHERE c.region_code = r.code)
""",
    ).bindparams(codes_param),
    {'codes': official_codes},
  )


def downgrade () -> None:
  # Data normalization is not safely reversible.
  return None

