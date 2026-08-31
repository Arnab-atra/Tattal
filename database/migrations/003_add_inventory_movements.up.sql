-- ============================================================
-- INVENTORY MOVEMENTS
--
-- Every stock change is recorded here.
--
-- quantity:
--   positive = stock enters
--   negative = stock leaves
--
-- Examples:
--
--   +10  purchase
--   +5   adjustment
--   -2   sale
--   +2   return
--
-- The trigger below automatically updates products.stock_quantity.
-- Therefore application code should NOT update stock_quantity
-- separately when inserting an inventory movement.
-- ============================================================

CREATE TABLE inventory_movements (
    id TEXT PRIMARY KEY NOT NULL,

    product_id TEXT NOT NULL,

    movement_type TEXT NOT NULL
        CHECK (
            movement_type IN (
                'PURCHASE',
                'SALE',
                'ADJUSTMENT',
                'RETURN'
            )
        ),

    quantity INTEGER NOT NULL
        CHECK (quantity <> 0),

    reference_type TEXT,

    reference_id TEXT,

    notes TEXT,

    created_at TEXT NOT NULL,

    FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE RESTRICT
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_inventory_movements_product
    ON inventory_movements(product_id);

CREATE INDEX idx_inventory_movements_created_at
    ON inventory_movements(created_at);

CREATE INDEX idx_inventory_movements_reference
    ON inventory_movements(reference_type, reference_id);

-- ============================================================
-- STOCK UPDATE TRIGGER
--
-- Whenever a movement is inserted, automatically update
-- the product's current stock.
--
-- The WHERE clause prevents stock from becoming negative.
-- If there isn't enough stock, SQLite aborts the INSERT.
-- ============================================================

CREATE TRIGGER trg_inventory_movement_update_stock
AFTER INSERT ON inventory_movements
WHEN EXISTS (
    SELECT 1
    FROM products
    WHERE id = NEW.product_id
      AND stock_quantity + NEW.quantity >= 0
)
BEGIN
    UPDATE products
    SET
        stock_quantity = stock_quantity + NEW.quantity,
        updated_at = NEW.created_at
    WHERE id = NEW.product_id;
END;

-- ============================================================
-- PREVENT INVALID STOCK MOVEMENTS
--
-- If the movement would make stock negative, abort it.
-- ============================================================

CREATE TRIGGER trg_inventory_movement_prevent_negative_stock
BEFORE INSERT ON inventory_movements
WHEN NOT EXISTS (
    SELECT 1
    FROM products
    WHERE id = NEW.product_id
      AND stock_quantity + NEW.quantity >= 0
)
BEGIN
    SELECT RAISE(
        ABORT,
        'Insufficient stock'
    );
END;
