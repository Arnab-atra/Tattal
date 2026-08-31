DROP TRIGGER IF EXISTS trg_inventory_movement_prevent_negative_stock;

DROP TRIGGER IF EXISTS trg_inventory_movement_update_stock;

DROP INDEX IF EXISTS idx_inventory_movements_reference;

DROP INDEX IF EXISTS idx_inventory_movements_created_at;

DROP INDEX IF EXISTS idx_inventory_movements_product;

DROP TABLE IF EXISTS inventory_movements;
