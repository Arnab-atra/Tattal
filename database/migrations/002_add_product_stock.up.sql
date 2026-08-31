-- ============================================================
-- PRODUCT STOCK
--
-- Stores the current available quantity of each product.
--
-- Stock is modified through inventory_movements.
-- The inventory movement trigger is responsible for keeping
-- this value synchronized.
-- ============================================================

ALTER TABLE products
ADD COLUMN stock_quantity INTEGER NOT NULL DEFAULT 0
CHECK (stock_quantity >= 0);

CREATE INDEX idx_products_stock
    ON products(stock_quantity);
