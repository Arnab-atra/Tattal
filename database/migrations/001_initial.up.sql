PRAGMA foreign_keys = ON;

CREATE TABLE customers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE products (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    sku TEXT,
    category TEXT,
    cost_price INTEGER NOT NULL DEFAULT 0,
    selling_price INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE sales (
    id TEXT PRIMARY KEY NOT NULL,
    customer_id TEXT,
    sale_date TEXT NOT NULL,
    subtotal INTEGER NOT NULL,
    discount INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (customer_id)
        REFERENCES customers(id)
);

CREATE TABLE sale_items (
    id TEXT PRIMARY KEY NOT NULL,
    sale_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    total INTEGER NOT NULL,

    FOREIGN KEY (sale_id)
        REFERENCES sales(id)
        ON DELETE CASCADE,

    FOREIGN KEY (product_id)
        REFERENCES products(id)
);

CREATE TABLE payments (
    id TEXT PRIMARY KEY NOT NULL,
    sale_id TEXT NOT NULL,
    payment_date TEXT NOT NULL,
    amount INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    reference TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,

    FOREIGN KEY (sale_id)
        REFERENCES sales(id)
        ON DELETE CASCADE
);

CREATE TABLE expenses (
    id TEXT PRIMARY KEY NOT NULL,
    expense_date TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    amount INTEGER NOT NULL,
    payment_method TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

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
