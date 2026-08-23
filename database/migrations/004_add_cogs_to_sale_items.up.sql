ALTER TABLE sale_items
ADD COLUMN cost_price INTEGER NOT NULL DEFAULT 0;

UPDATE sale_items
SET cost_price = (
    SELECT cost_price
    FROM products
    WHERE products.id = sale_items.product_id
);
