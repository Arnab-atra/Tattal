-- ============================================================
-- ROLLBACK COST OF GOODS SOLD
-- ============================================================

DROP TRIGGER IF EXISTS trg_sale_item_set_cost_price;

ALTER TABLE sale_items
DROP COLUMN cost_price;
