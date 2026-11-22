
-- =============================================
-- PIVOT: SALES INTELLIGENCE DATABASE
-- Database: SQLite
-- =============================================

PRAGMA foreign_keys = ON;

-- 1. Product categories
CREATE TABLE IF NOT EXISTS categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT NOT NULL UNIQUE
);

-- 2. Products
CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    list_price REAL NOT NULL CHECK (list_price > 0),

    FOREIGN KEY (category_id)
        REFERENCES categories(category_id)
);

-- 3. Customers
CREATE TABLE IF NOT EXISTS customers (
    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    region TEXT NOT NULL
);

-- 4. Customer orders
CREATE TABLE IF NOT EXISTS orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    order_date TEXT NOT NULL,
    order_status TEXT NOT NULL
        CHECK (
            order_status IN (
                'completed',
                'pending',
                'cancelled'
            )
        ),

    FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
);

-- 5. Individual items inside each order
CREATE TABLE IF NOT EXISTS order_items (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price > 0),
    discount_pct REAL NOT NULL DEFAULT 0
        CHECK (discount_pct >= 0 AND discount_pct <= 0.50),

    FOREIGN KEY (order_id)
        REFERENCES orders(order_id),

    FOREIGN KEY (product_id)
        REFERENCES products(product_id)
);

-- =============================================
-- INDEXES FOR QUERY PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_orders_date
ON orders(order_date);

CREATE INDEX IF NOT EXISTS idx_orders_status
ON orders(order_status);

CREATE INDEX IF NOT EXISTS idx_orders_customer
ON orders(customer_id);

CREATE INDEX IF NOT EXISTS idx_order_items_order
ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product
ON order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_products_category
ON products(category_id);

CREATE INDEX IF NOT EXISTS idx_customers_region
ON customers(region);
