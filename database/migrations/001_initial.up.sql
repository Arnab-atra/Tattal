PRAGMA foreign_keys = ON;

-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE TABLE customers (
    id TEXT PRIMARY KEY NOT NULL,

    name TEXT NOT NULL,

    phone TEXT,

    email TEXT,

    notes TEXT,

    created_at TEXT NOT NULL,

    updated_at TEXT NOT NULL
);

-- ============================================================
-- PRODUCTS
-- ============================================================

CREATE TABLE products (
    id TEXT PRIMARY KEY NOT NULL,

    name TEXT NOT NULL,

    sku TEXT,

    category TEXT,

    -- Money is stored as integer minor units.
    -- Example: ₹125.50 should be stored as 12550 if using paise.
    cost_price INTEGER NOT NULL DEFAULT 0
        CHECK (cost_price >= 0),

    selling_price INTEGER NOT NULL DEFAULT 0
        CHECK (selling_price >= 0),

    created_at TEXT NOT NULL,

    updated_at TEXT NOT NULL
);

-- ============================================================
-- SALES
-- ============================================================

CREATE TABLE sales (
    id TEXT PRIMARY KEY NOT NULL,

    customer_id TEXT,

    sale_date TEXT NOT NULL,

    subtotal INTEGER NOT NULL
        CHECK (subtotal >= 0),

    discount INTEGER NOT NULL DEFAULT 0
        CHECK (discount >= 0),

    total INTEGER NOT NULL
        CHECK (total >= 0),

    notes TEXT,

    created_at TEXT NOT NULL,

    updated_at TEXT NOT NULL,

    FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE RESTRICT
);

-- ============================================================
-- SALE ITEMS
-- ============================================================

CREATE TABLE sale_items (
    id TEXT PRIMARY KEY NOT NULL,

    sale_id TEXT NOT NULL,

    product_id TEXT NOT NULL,

    quantity INTEGER NOT NULL
        CHECK (quantity > 0),

    unit_price INTEGER NOT NULL
        CHECK (unit_price >= 0),

    total INTEGER NOT NULL
        CHECK (total >= 0),

    FOREIGN KEY (sale_id)
        REFERENCES sales(id)
        ON DELETE CASCADE,

    FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE RESTRICT
);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
    id TEXT PRIMARY KEY NOT NULL,

    sale_id TEXT NOT NULL,

    payment_date TEXT NOT NULL,

    amount INTEGER NOT NULL
        CHECK (amount >= 0),

    payment_method TEXT NOT NULL,

    reference TEXT,

    notes TEXT,

    created_at TEXT NOT NULL,

    FOREIGN KEY (sale_id)
        REFERENCES sales(id)
        ON DELETE CASCADE
);

-- ============================================================
-- EXPENSES
-- ============================================================

CREATE TABLE expenses (
    id TEXT PRIMARY KEY NOT NULL,

    expense_date TEXT NOT NULL,

    category TEXT NOT NULL,

    description TEXT,

    amount INTEGER NOT NULL
        CHECK (amount >= 0),

    payment_method TEXT,

    notes TEXT,

    created_at TEXT NOT NULL,

    updated_at TEXT NOT NULL
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_sales_date
    ON sales(sale_date);

CREATE INDEX idx_sales_customer
    ON sales(customer_id);

CREATE INDEX idx_sale_items_sale
    ON sale_items(sale_id);

CREATE INDEX idx_sale_items_product
    ON sale_items(product_id);

CREATE INDEX idx_payments_date
    ON payments(payment_date);

CREATE INDEX idx_expenses_date
    ON expenses(expense_date);
