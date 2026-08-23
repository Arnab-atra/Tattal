CREATE TABLE inventory_movements (
    id TEXT PRIMARY KEY NOT NULL,
    product_id TEXT NOT NULL,
    movement_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reference_type TEXT,
    reference_id TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,

    FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_inventory_movements_product
    ON inventory_movements(product_id);

CREATE INDEX idx_inventory_movements_created_at
    ON inventory_movements(created_at);
