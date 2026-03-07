"""create addressbook and checklists tables

Revision ID: 0006_addressbook_checklists
Revises: 0005_projects_refs
Create Date: 2026-03-05

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0006_addressbook_checklists'
down_revision = '0005_projects_refs'
branch_labels = None
depends_on = None


def upgrade () -> None:
  op.create_table(
    'shop_chain',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('name', sa.String(length=250), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['company_id'], ['users.company.id'], ondelete='RESTRICT'),
    sa.UniqueConstraint('company_id', 'name', name='uq_projects_shop_chain_company_name'),
    schema='projects',
  )
  op.create_index('ix_projects_shop_chain_company_id', 'shop_chain', ['company_id'], schema='projects')
  op.create_index('ix_projects_shop_chain_name', 'shop_chain', ['name'], schema='projects')

  op.create_table(
    'shop_point',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('chain_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('code', sa.String(length=120), nullable=False),
    sa.Column('point_name', sa.String(length=250), nullable=True),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('region_code', sa.String(length=3), nullable=True),
    sa.Column('city_name', sa.String(length=250), nullable=True),
    sa.Column('concat', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['project_id'], ['projects.project.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['chain_id'], ['projects.shop_chain.id'], ondelete='RESTRICT'),
    sa.UniqueConstraint('project_id', 'code', name='uq_projects_shop_point_project_code'),
    schema='projects',
  )
  op.create_index('ix_projects_shop_point_project_id', 'shop_point', ['project_id'], schema='projects')
  op.create_index('ix_projects_shop_point_chain_id', 'shop_point', ['chain_id'], schema='projects')
  op.create_index('ix_projects_shop_point_region_code', 'shop_point', ['region_code'], schema='projects')
  op.create_index('ix_projects_shop_point_city_name', 'shop_point', ['city_name'], schema='projects')

  op.create_table(
    'ref_brand',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('name', sa.String(length=250), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['company_id'], ['users.company.id'], ondelete='RESTRICT'),
    sa.UniqueConstraint('company_id', 'name', name='uq_projects_ref_brand_company_name'),
    schema='projects',
  )
  op.create_index('ix_projects_ref_brand_company_id', 'ref_brand', ['company_id'], schema='projects')
  op.create_index('ix_projects_ref_brand_name', 'ref_brand', ['name'], schema='projects')

  op.create_table(
    'ref_category',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('name', sa.String(length=250), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['company_id'], ['users.company.id'], ondelete='RESTRICT'),
    sa.UniqueConstraint('company_id', 'name', name='uq_projects_ref_category_company_name'),
    schema='projects',
  )
  op.create_index('ix_projects_ref_category_company_id', 'ref_category', ['company_id'], schema='projects')
  op.create_index('ix_projects_ref_category_name', 'ref_category', ['name'], schema='projects')

  op.create_table(
    'ref_product',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('brand_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('article', sa.String(length=120), nullable=True),
    sa.Column('name', sa.Text(), nullable=False),
    sa.Column('size', sa.String(length=120), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['brand_id'], ['projects.ref_brand.id'], ondelete='RESTRICT'),
    sa.UniqueConstraint('brand_id', 'article', 'name', 'size', name='uq_projects_ref_product_brand_article_name_size'),
    schema='projects',
  )
  op.create_index('ix_projects_ref_product_brand_id', 'ref_product', ['brand_id'], schema='projects')
  op.create_index('ix_projects_ref_product_article', 'ref_product', ['article'], schema='projects')

  op.create_table(
    'checklist',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('chain_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('title', sa.String(length=250), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['project_id'], ['projects.project.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['chain_id'], ['projects.shop_chain.id'], ondelete='RESTRICT'),
    sa.UniqueConstraint('project_id', 'chain_id', 'title', name='uq_projects_checklist_project_chain_title'),
    schema='projects',
  )
  op.create_index('ix_projects_checklist_project_id', 'checklist', ['project_id'], schema='projects')
  op.create_index('ix_projects_checklist_chain_id', 'checklist', ['chain_id'], schema='projects')

  op.create_table(
    'checklist_item',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    sa.Column('checklist_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('product_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
    sa.ForeignKeyConstraint(['checklist_id'], ['projects.checklist.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['category_id'], ['projects.ref_category.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['product_id'], ['projects.ref_product.id'], ondelete='RESTRICT'),
    sa.UniqueConstraint('checklist_id', 'category_id', 'product_id', name='uq_projects_checklist_item_unique'),
    schema='projects',
  )
  op.create_index('ix_projects_checklist_item_checklist_id', 'checklist_item', ['checklist_id'], schema='projects')
  op.create_index('ix_projects_checklist_item_category_id', 'checklist_item', ['category_id'], schema='projects')
  op.create_index('ix_projects_checklist_item_product_id', 'checklist_item', ['product_id'], schema='projects')


def downgrade () -> None:
  op.drop_index('ix_projects_checklist_item_product_id', table_name='checklist_item', schema='projects')
  op.drop_index('ix_projects_checklist_item_category_id', table_name='checklist_item', schema='projects')
  op.drop_index('ix_projects_checklist_item_checklist_id', table_name='checklist_item', schema='projects')
  op.drop_table('checklist_item', schema='projects')

  op.drop_index('ix_projects_checklist_chain_id', table_name='checklist', schema='projects')
  op.drop_index('ix_projects_checklist_project_id', table_name='checklist', schema='projects')
  op.drop_table('checklist', schema='projects')

  op.drop_index('ix_projects_ref_product_article', table_name='ref_product', schema='projects')
  op.drop_index('ix_projects_ref_product_brand_id', table_name='ref_product', schema='projects')
  op.drop_table('ref_product', schema='projects')

  op.drop_index('ix_projects_ref_category_name', table_name='ref_category', schema='projects')
  op.drop_index('ix_projects_ref_category_company_id', table_name='ref_category', schema='projects')
  op.drop_table('ref_category', schema='projects')

  op.drop_index('ix_projects_ref_brand_name', table_name='ref_brand', schema='projects')
  op.drop_index('ix_projects_ref_brand_company_id', table_name='ref_brand', schema='projects')
  op.drop_table('ref_brand', schema='projects')

  op.drop_index('ix_projects_shop_point_city_name', table_name='shop_point', schema='projects')
  op.drop_index('ix_projects_shop_point_region_code', table_name='shop_point', schema='projects')
  op.drop_index('ix_projects_shop_point_chain_id', table_name='shop_point', schema='projects')
  op.drop_index('ix_projects_shop_point_project_id', table_name='shop_point', schema='projects')
  op.drop_table('shop_point', schema='projects')

  op.drop_index('ix_projects_shop_chain_name', table_name='shop_chain', schema='projects')
  op.drop_index('ix_projects_shop_chain_company_id', table_name='shop_chain', schema='projects')
  op.drop_table('shop_chain', schema='projects')

