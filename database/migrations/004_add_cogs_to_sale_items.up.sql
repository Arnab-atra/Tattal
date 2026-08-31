-- ============================================================
-- COST OF GOODS SOLD
--
-- Stores the product cost at the exact time the sale occurs.
--
-- This is a snapshot.
--
-- Example:
--
-- Product cost today:     ₹100
-- Product sold today:     ₹150
-- sale_items.cost_price:  ₹100
--
-- Later product cost changes to ₹120.
--
-- The old sale_item remains ₹100.
--
-- This is essential for historical profit calculations.
-- ============================================================

ALTER TABLE sale_items
ADD COLUMN cost_price INTEGER NOT NULL DEFAULT 0
CHECK (cost_price >= 0);

-- ============================================================
-- BACKFILL EXISTING SALES
-- ============================================================

UPDATE sale_items
SET cost_price = COALESCE(
    (
        SELECT products.cost_price
        FROM products
        WHERE products.id = sale_items.product_id
    ),
    0
);

-- ============================================================
-- AUTOMATIC COGS SNAPSHOT
--
-- When a new sale item is inserted with the default cost_price
-- of 0, copy the current product cost into the sale item.
-- ============================================================

CREATE TRIGGER trg_sale_item_set_cost_price
AFTER INSERT ON sale_items
WHEN NEW.cost_price = 0
BEGIN
    UPDATE sale_items
    SET cost_price = COALESCE(
        (
            SELECT products.cost_price
            FROM products
            WHERE products.id = NEW.product_id
        ),
        0
    )
    WHERE id = NEW.id;
END;
