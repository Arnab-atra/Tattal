ALTER TABLE products
ADD COLUMN stock_quantity INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_products_stock
    ON products(stock_quantity);
