DROP INDEX IF EXISTS idx_products_stock;

ALTER TABLE products
DROP COLUMN stock_quantity;
