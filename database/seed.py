
"""
PIVOT — Sales Intelligence
Deterministic fictional sales dataset generator.

Creates:
- 6 product categories
- 24 products
- 250 customers
- 1,800 orders
- Multiple order items per order

All names and transactions are fictional.
"""

import random
import sqlite3
from datetime import date, timedelta
from pathlib import Path


# =============================================
# 01. PROJECT PATHS
# =============================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
DATABASE_PATH = DATA_DIR / "pivot.db"
SCHEMA_PATH = PROJECT_ROOT / "database" / "schema.sql"

RANDOM_SEED = 42


# =============================================
# 02. FICTIONAL PRODUCT CATEGORIES
# =============================================

CATEGORIES = [
    "Electronics",
    "Home & Living",
    "Fashion",
    "Sports & Outdoors",
    "Beauty & Wellness",
    "Office & Stationery",
]


# =============================================
# 03. FICTIONAL PRODUCT CATALOG
# =============================================

PRODUCTS = [
    # Electronics
    ("Wireless Headphones", "Electronics", 2499),
    ("Smart Watch", "Electronics", 4999),
    ("Bluetooth Speaker", "Electronics", 1899),
    ("Mechanical Keyboard", "Electronics", 3499),

    # Home & Living
    ("Smart Table Lamp", "Home & Living", 1499),
    ("Ceramic Dinner Set", "Home & Living", 2199),
    ("Cotton Bedsheet", "Home & Living", 1799),
    ("Storage Organizer", "Home & Living", 899),

    # Fashion
    ("Classic Denim Jacket", "Fashion", 2799),
    ("Everyday Sneakers", "Fashion", 3299),
    ("Canvas Backpack", "Fashion", 1599),
    ("Cotton Casual Shirt", "Fashion", 1299),

    # Sports & Outdoors
    ("Yoga Mat", "Sports & Outdoors", 999),
    ("Fitness Dumbbell Set", "Sports & Outdoors", 2499),
    ("Hiking Backpack", "Sports & Outdoors", 3999),
    ("Insulated Water Bottle", "Sports & Outdoors", 799),

    # Beauty & Wellness
    ("Skincare Gift Set", "Beauty & Wellness", 1899),
    ("Electric Face Brush", "Beauty & Wellness", 1499),
    ("Aroma Diffuser", "Beauty & Wellness", 2299),
    ("Essential Oil Kit", "Beauty & Wellness", 1199),

    # Office & Stationery
    ("Executive Notebook", "Office & Stationery", 499),
    ("Desk Organizer", "Office & Stationery", 899),
    ("Ergonomic Office Chair", "Office & Stationery", 12499),
    ("Monitor Stand", "Office & Stationery", 1799),
]


# =============================================
# 04. CUSTOMER REGIONS
# =============================================

REGIONS = [
    "North",
    "South",
    "East",
    "West",
    "Central",
    "Northeast",
]


# =============================================
# 05. DATABASE INITIALIZATION
# =============================================

def initialize_database(connection):
    """Create database tables and indexes."""

    schema = SCHEMA_PATH.read_text(encoding="utf-8")

    connection.executescript(schema)

    print("Database schema initialized.")


def clear_existing_data(connection):
    """Clear existing records for reproducible seeding."""

    connection.execute("DELETE FROM order_items")
    connection.execute("DELETE FROM orders")
    connection.execute("DELETE FROM customers")
    connection.execute("DELETE FROM products")
    connection.execute("DELETE FROM categories")

    # Reset auto-increment counters.
    connection.execute(
        "DELETE FROM sqlite_sequence "
        "WHERE name IN "
        "('categories', 'products', 'customers', 'orders', 'order_items')"
    )

    print("Existing records cleared.")


# =============================================
# 06. INSERT CATEGORIES AND PRODUCTS
# =============================================

def insert_catalog(connection):
    """Insert categories and products."""

    connection.executemany(
        """
        INSERT INTO categories (category_name)
        VALUES (?)
        """,
        [(name,) for name in CATEGORIES],
    )

    category_rows = connection.execute(
        """
        SELECT category_id, category_name
        FROM categories
        """
    ).fetchall()

    category_ids = {
        name: category_id
        for category_id, name in category_rows
    }

    product_records = [
        (
            name,
            category_ids[category],
            price,
        )
        for name, category, price in PRODUCTS
    ]

    connection.executemany(
        """
        INSERT INTO products (
            product_name,
            category_id,
            list_price
        )
        VALUES (?, ?, ?)
        """,
        product_records,
    )

    product_rows = connection.execute(
        """
        SELECT product_id, list_price
        FROM products
        """
    ).fetchall()

    print(f"Inserted {len(CATEGORIES)} categories.")
    print(f"Inserted {len(product_rows)} products.")

    return product_rows


# =============================================
# 07. GENERATE FICTIONAL CUSTOMERS
# =============================================

def insert_customers(connection, rng):
    """Generate 250 fictional customers."""

    customers = []

    for number in range(1, 251):

        name = f"Customer {number:03d}"
        region = rng.choice(REGIONS)

        customers.append((name, region))

    connection.executemany(
        """
        INSERT INTO customers (
            customer_name,
            region
        )
        VALUES (?, ?)
        """,
        customers,
    )

    customer_ids = [
        row[0]
        for row in connection.execute(
            "SELECT customer_id FROM customers"
        ).fetchall()
    ]

    print(f"Inserted {len(customers)} customers.")

    return customer_ids


# =============================================
# 08. GENERATE SALES TRANSACTIONS
# =============================================

def insert_sales(connection, rng, customers, products):
    """
    Generate 1,800 orders across calendar year 2025.

    Each order contains 1–4 different products.
    Each item has a quantity and a discount.
    """

    start_date = date(2025, 1, 1)
    end_date = date(2025, 12, 31)

    date_range = (end_date - start_date).days

    orders = []
    order_items = []

    product_ids = [product_id for product_id, _ in products]

    product_prices = {
        product_id: price
        for product_id, price in products
    }

    discount_options = [
        0.00,
        0.05,
        0.10,
        0.15,
        0.20,
    ]

    discount_weights = [
        40,
        22,
        20,
        12,
        6,
    ]

    for order_number in range(1, 1801):

        customer_id = rng.choice(customers)

        random_day = rng.randint(0, date_range)

        order_date = (
            start_date + timedelta(days=random_day)
        ).isoformat()

        status = rng.choices(
            ["completed", "pending", "cancelled"],
            weights=[90, 7, 3],
            k=1,
        )[0]

        orders.append(
            (
                customer_id,
                order_date,
                status,
            )
        )

        # Every order includes at least one product.
        item_count = rng.randint(1, 4)

        selected_products = rng.sample(
            product_ids,
            item_count,
        )

        for product_id in selected_products:

            quantity = rng.randint(1, 5)

            discount = rng.choices(
                discount_options,
                weights=discount_weights,
                k=1,
            )[0]

            unit_price = product_prices[product_id]

            order_items.append(
                (
                    order_number,
                    product_id,
                    quantity,
                    unit_price,
                    discount,
                )
            )

    connection.executemany(
        """
        INSERT INTO orders (
            customer_id,
            order_date,
            order_status
        )
        VALUES (?, ?, ?)
        """,
        orders,
    )

    connection.executemany(
        """
        INSERT INTO order_items (
            order_id,
            product_id,
            quantity,
            unit_price,
            discount_pct
        )
        VALUES (?, ?, ?, ?, ?)
        """,
        order_items,
    )

    print(f"Inserted {len(orders)} orders.")
    print(f"Inserted {len(order_items)} order items.")


# =============================================
# 09. DATABASE SUMMARY
# =============================================

def display_database_summary(connection):
    """Print database counts and completed sales."""

    print("\n" + "=" * 48)
    print("PIVOT — DATABASE SUMMARY")
    print("=" * 48)

    tables = [
        "categories",
        "products",
        "customers",
        "orders",
        "order_items",
    ]

    for table in tables:

        count = connection.execute(
            f"SELECT COUNT(*) FROM {table}"
        ).fetchone()[0]

        print(f"{table:<18} {count:>8,}")

    completed_orders = connection.execute(
        """
        SELECT COUNT(*)
        FROM orders
        WHERE order_status = 'completed'
        """
    ).fetchone()[0]

    completed_revenue = connection.execute(
        """
        SELECT COALESCE(
            SUM(
                oi.quantity *
                oi.unit_price *
                (1 - oi.discount_pct)
            ),
            0
        )
        FROM order_items AS oi
        INNER JOIN orders AS o
            ON o.order_id = oi.order_id
        WHERE o.order_status = 'completed'
        """
    ).fetchone()[0]

    print("-" * 48)

    print(f"Completed orders: {completed_orders:,}")

    print(
        "Completed revenue: "
        f"₹{completed_revenue:,.2f}"
    )

    print("=" * 48)
    print("Database generated successfully.")


# =============================================
# 10. MAIN EXECUTION
# =============================================

def main():

    rng = random.Random(RANDOM_SEED)

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    print("\nStarting PIVOT database generation...\n")

    with sqlite3.connect(DATABASE_PATH) as connection:

        connection.execute("PRAGMA foreign_keys = ON")

        initialize_database(connection)

        clear_existing_data(connection)

        product_rows = insert_catalog(connection)

        customer_ids = insert_customers(connection, rng)

        insert_sales(
            connection,
            rng,
            customer_ids,
            product_rows,
        )

        connection.commit()

        display_database_summary(connection)

    print(f"\nDatabase location: {DATABASE_PATH}")


if __name__ == "__main__":
    main()
