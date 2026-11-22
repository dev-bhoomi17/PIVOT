
"""
PIVOT — Sales Intelligence Dashboard
Flask backend with live SQLite aggregation queries.

All sales figures are calculated from the local SQLite database.
No dashboard KPI or chart values are hardcoded.
"""

from datetime import datetime
from pathlib import Path
import sqlite3

from flask import Flask, jsonify, render_template, request


# =====================================================
# 01. APPLICATION CONFIGURATION
# =====================================================

BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "data" / "pivot.db"

app = Flask(__name__)

BASE_JOINS = """
FROM orders AS o

INNER JOIN customers AS cu
    ON o.customer_id = cu.customer_id

INNER JOIN order_items AS oi
    ON o.order_id = oi.order_id

INNER JOIN products AS p
    ON oi.product_id = p.product_id

INNER JOIN categories AS cat
    ON p.category_id = cat.category_id
"""


# =====================================================
# 02. DATABASE HELPERS
# =====================================================

def get_connection():
    """Create a SQLite connection with named-column access."""

    if not DATABASE_PATH.exists():
        raise FileNotFoundError(
            "Sales database not found. Run database/seed.py first."
        )

    connection = sqlite3.connect(str(DATABASE_PATH))
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")

    return connection


def fetch_all(sql, parameters=()):
    """Execute a SELECT query and return dictionary records."""

    connection = get_connection()

    try:
        cursor = connection.execute(sql, parameters)
        return [dict(row) for row in cursor.fetchall()]

    finally:
        connection.close()


def fetch_one(sql, parameters=()):
    """Execute a SELECT query and return one dictionary record."""

    connection = get_connection()

    try:
        cursor = connection.execute(sql, parameters)
        row = cursor.fetchone()

        return dict(row) if row else None

    finally:
        connection.close()


# =====================================================
# 03. FILTER OPTIONS
# =====================================================

def get_filter_options():
    """Retrieve available dates, regions and categories."""

    date_range = fetch_one(
        """
        SELECT
            MIN(order_date) AS minimum_date,
            MAX(order_date) AS maximum_date
        FROM orders
        WHERE order_status = 'completed'
        """
    )

    if not date_range or not date_range["minimum_date"]:
        raise ValueError("No completed sales data is available.")

    regions = fetch_all(
        """
        SELECT DISTINCT region
        FROM customers
        ORDER BY region
        """
    )

    categories = fetch_all(
        """
        SELECT category_name
        FROM categories
        ORDER BY category_name
        """
    )

    return {
        "minimum_date": date_range["minimum_date"],
        "maximum_date": date_range["maximum_date"],
        "regions": [row["region"] for row in regions],
        "categories": [
            row["category_name"] for row in categories
        ],
    }


# =====================================================
# 04. VALIDATE DASHBOARD FILTERS
# =====================================================

def parse_date(value, field_name):
    """Validate an ISO formatted date."""

    try:
        datetime.strptime(value, "%Y-%m-%d")

    except (ValueError, TypeError):
        raise ValueError(
            f"Invalid {field_name}. Use YYYY-MM-DD format."
        )

    return value


def parse_dashboard_filters():
    """Read and validate filters supplied by the frontend."""

    options = get_filter_options()

    start_date = request.args.get(
        "start_date",
        options["minimum_date"]
    )

    end_date = request.args.get(
        "end_date",
        options["maximum_date"]
    )

    start_date = parse_date(start_date, "start_date")
    end_date = parse_date(end_date, "end_date")

    if start_date > end_date:
        raise ValueError(
            "Start date cannot be later than end date."
        )

    region = request.args.get("region", "All").strip()
    category = request.args.get("category", "All").strip()

    if region != "All" and region not in options["regions"]:
        raise ValueError("Invalid region filter.")

    if (
        category != "All"
        and category not in options["categories"]
    ):
        raise ValueError("Invalid category filter.")

    try:
        minimum_revenue = float(
            request.args.get("min_revenue", "1000000")
        )

    except ValueError:
        raise ValueError("Minimum revenue must be numeric.")

    if minimum_revenue < 0 or minimum_revenue > 1000000000:
        raise ValueError("Minimum revenue is outside the allowed range.")

    return {
        "start_date": start_date,
        "end_date": end_date,
        "region": region,
        "category": category,
        "min_revenue": minimum_revenue,
    }


# =====================================================
# 05. BUILD SAFE SQL FILTER CONDITIONS
# =====================================================

def build_filter_conditions(filters):
    """
    Build parameterized WHERE conditions.

    User-provided values are passed separately to SQLite.
    They are never directly inserted into SQL statements.
    """

    conditions = [
        "o.order_status = 'completed'",
        "o.order_date BETWEEN ? AND ?",
    ]

    parameters = [
        filters["start_date"],
        filters["end_date"],
    ]

    if filters["region"] != "All":
        conditions.append("cu.region = ?")
        parameters.append(filters["region"])

    if filters["category"] != "All":
        conditions.append("cat.category_name = ?")
        parameters.append(filters["category"])

    return " AND ".join(conditions), parameters


# =====================================================
# 06. KPI SUMMARY QUERY
# =====================================================

def get_summary(where_clause, parameters):
    """
    Business question:
    What are the overall sales performance indicators?

    AOV is calculated using individual order totals,
    not individual product lines.
    """

    sql = f"""
        WITH filtered_items AS (

            SELECT
                o.order_id,
                o.customer_id,
                oi.quantity,

                (
                    oi.quantity *
                    oi.unit_price *
                    (1 - oi.discount_pct)
                ) AS line_revenue

            {BASE_JOINS}

            WHERE {where_clause}
        ),

        order_totals AS (

            SELECT
                order_id,
                SUM(line_revenue) AS order_revenue

            FROM filtered_items

            GROUP BY order_id
        )

        SELECT

            ROUND(
                COALESCE(
                    (SELECT SUM(line_revenue)
                     FROM filtered_items),
                    0
                ),
                2
            ) AS total_revenue,

            COALESCE(
                (SELECT SUM(quantity)
                 FROM filtered_items),
                0
            ) AS units_sold,

            COALESCE(
                (SELECT COUNT(*)
                 FROM order_totals),
                0
            ) AS total_orders,

            COALESCE(
                (SELECT COUNT(DISTINCT customer_id)
                 FROM filtered_items),
                0
            ) AS total_customers,

            ROUND(
                COALESCE(
                    (SELECT AVG(order_revenue)
                     FROM order_totals),
                    0
                ),
                2
            ) AS average_order_value

    """

    return fetch_one(sql, parameters)


# =====================================================
# 07. MONTHLY REVENUE QUERY
# =====================================================

def get_monthly_sales(where_clause, parameters):
    """Aggregate revenue and orders by calendar month."""

    sql = f"""
        WITH filtered_items AS (

            SELECT
                o.order_id,
                o.order_date,
                oi.quantity,

                (
                    oi.quantity *
                    oi.unit_price *
                    (1 - oi.discount_pct)
                ) AS line_revenue

            {BASE_JOINS}

            WHERE {where_clause}
        ),

        order_totals AS (

            SELECT
                strftime('%Y-%m', order_date) AS sales_month,
                order_id,

                SUM(line_revenue) AS order_revenue,
                SUM(quantity) AS units_sold

            FROM filtered_items

            GROUP BY
                sales_month,
                order_id
        )

        SELECT
            sales_month,

            COUNT(*) AS total_orders,

            ROUND(SUM(order_revenue), 2)
                AS monthly_revenue,

            ROUND(AVG(order_revenue), 2)
                AS average_order_value,

            SUM(units_sold) AS units_sold

        FROM order_totals

        GROUP BY sales_month

        ORDER BY sales_month ASC
    """

    return fetch_all(sql, parameters)


# =====================================================
# 08. CATEGORY PERFORMANCE QUERY
# =====================================================

def get_category_sales(
    where_clause,
    parameters,
    minimum_revenue
):
    """
    Aggregate category performance.

    HAVING dynamically filters categories according
    to the dashboard's revenue threshold.
    """

    sql = f"""
        SELECT

            cat.category_name,

            ROUND(
                SUM(
                    oi.quantity *
                    oi.unit_price *
                    (1 - oi.discount_pct)
                ),
                2
            ) AS total_revenue,

            SUM(oi.quantity) AS units_sold,

            COUNT(DISTINCT o.order_id)
                AS total_orders,

            ROUND(
                AVG(
                    oi.unit_price *
                    (1 - oi.discount_pct)
                ),
                2
            ) AS average_selling_price

        {BASE_JOINS}

        WHERE {where_clause}

        GROUP BY
            cat.category_id,
            cat.category_name

        HAVING
            SUM(
                oi.quantity *
                oi.unit_price *
                (1 - oi.discount_pct)
            ) >= ?

        ORDER BY total_revenue DESC
    """

    return fetch_all(
        sql,
        parameters + [minimum_revenue]
    )


# =====================================================
# 09. REGIONAL PERFORMANCE QUERY
# =====================================================

def get_regional_sales(where_clause, parameters):
    """
    Calculate regional revenue and average order value.

    First aggregate individual orders, then group by
    region to calculate a correct average.
    """

    sql = f"""
        WITH filtered_items AS (

            SELECT
                o.order_id,
                cu.region,
                oi.quantity,

                (
                    oi.quantity *
                    oi.unit_price *
                    (1 - oi.discount_pct)
                ) AS line_revenue

            {BASE_JOINS}

            WHERE {where_clause}
        ),

        order_totals AS (

            SELECT
                region,
                order_id,

                SUM(line_revenue) AS order_revenue,
                SUM(quantity) AS total_units

            FROM filtered_items

            GROUP BY
                region,
                order_id
        )

        SELECT

            region,

            COUNT(*) AS total_orders,

            ROUND(SUM(order_revenue), 2)
                AS total_revenue,

            ROUND(AVG(order_revenue), 2)
                AS average_order_value,

            ROUND(MIN(order_revenue), 2)
                AS smallest_order_value,

            ROUND(MAX(order_revenue), 2)
                AS largest_order_value,

            SUM(total_units) AS units_sold

        FROM order_totals

        GROUP BY region

        HAVING COUNT(*) >= 1

        ORDER BY total_revenue DESC
    """

    return fetch_all(sql, parameters)


# =====================================================
# 10. TOP PRODUCT QUERY
# =====================================================

def get_top_products(where_clause, parameters):
    """Return the ten highest revenue-generating products."""

    sql = f"""
        SELECT

            p.product_id,
            p.product_name,
            cat.category_name,

            SUM(oi.quantity) AS units_sold,

            COUNT(DISTINCT o.order_id)
                AS orders_count,

            ROUND(
                SUM(
                    oi.quantity *
                    oi.unit_price *
                    (1 - oi.discount_pct)
                ),
                2
            ) AS total_revenue,

            ROUND(
                AVG(
                    oi.unit_price *
                    (1 - oi.discount_pct)
                ),
                2
            ) AS average_selling_price,

            ROUND(
                MIN(
                    oi.unit_price *
                    (1 - oi.discount_pct)
                ),
                2
            ) AS minimum_selling_price,

            ROUND(
                MAX(
                    oi.unit_price *
                    (1 - oi.discount_pct)
                ),
                2
            ) AS maximum_selling_price

        {BASE_JOINS}

        WHERE {where_clause}

        GROUP BY
            p.product_id,
            p.product_name,
            cat.category_name

        ORDER BY total_revenue DESC

        LIMIT 10
    """

    return fetch_all(sql, parameters)


# =====================================================
# 11. HIGH-VALUE ORDERS QUERY
# =====================================================

def get_high_value_orders(where_clause, parameters):
    """Find completed orders with revenue of at least ₹10,000."""

    sql = f"""
        WITH filtered_items AS (

            SELECT
                o.order_id,
                o.order_date,
                cu.customer_name,
                cu.region,
                oi.item_id,
                oi.quantity,

                (
                    oi.quantity *
                    oi.unit_price *
                    (1 - oi.discount_pct)
                ) AS line_revenue

            {BASE_JOINS}

            WHERE {where_clause}
        ),

        order_totals AS (

            SELECT
                order_id,
                order_date,
                customer_name,
                region,

                COUNT(item_id) AS order_lines,
                SUM(quantity) AS total_units,
                SUM(line_revenue) AS order_revenue

            FROM filtered_items

            GROUP BY
                order_id,
                order_date,
                customer_name,
                region
        )

        SELECT

            order_id,
            order_date,
            customer_name,
            region,
            order_lines,
            total_units,

            ROUND(order_revenue, 2)
                AS order_revenue

        FROM order_totals

        WHERE order_revenue >= 10000

        ORDER BY order_revenue DESC

        LIMIT 10
    """

    return fetch_all(sql, parameters)


# =====================================================
# 12. DASHBOARD WEB PAGE
# =====================================================

@app.get("/")
def index():

    if not DATABASE_PATH.exists():
        return (
            "PIVOT database is missing. "
            "Run database/seed.py before starting the application.",
            503,
        )

    return render_template("index.html")


# =====================================================
# 13. FILTER OPTIONS API
# =====================================================

@app.get("/api/filters")
def api_filters():

    try:
        return jsonify({
            "success": True,
            "filters": get_filter_options(),
        })

    except (sqlite3.Error, FileNotFoundError, ValueError) as error:
        app.logger.exception("Unable to load filter options.")

        return jsonify({
            "success": False,
            "error": str(error),
        }), 500


# =====================================================
# 14. MAIN DASHBOARD API
# =====================================================

@app.get("/api/dashboard")
def api_dashboard():

    try:

        filters = parse_dashboard_filters()

        where_clause, parameters = (
            build_filter_conditions(filters)
        )

        response = {

            "success": True,

            "filters": filters,

            "summary": get_summary(
                where_clause,
                parameters,
            ),

            "monthly_sales": get_monthly_sales(
                where_clause,
                parameters,
            ),

            "category_sales": get_category_sales(
                where_clause,
                parameters,
                filters["min_revenue"],
            ),

            "regional_sales": get_regional_sales(
                where_clause,
                parameters,
            ),

            "top_products": get_top_products(
                where_clause,
                parameters,
            ),

            "high_value_orders": get_high_value_orders(
                where_clause,
                parameters,
            ),
        }

        return jsonify(response)

    except ValueError as error:

        return jsonify({
            "success": False,
            "error": str(error),
        }), 400

    except FileNotFoundError as error:

        return jsonify({
            "success": False,
            "error": str(error),
        }), 503

    except sqlite3.Error:

        app.logger.exception(
            "A SQL error occurred while loading the dashboard."
        )

        return jsonify({
            "success": False,
            "error": "Unable to calculate dashboard data.",
        }), 500


# =====================================================
# 15. HEALTH CHECK API
# =====================================================

@app.get("/api/health")
def api_health():

    try:

        fetch_one("SELECT 1 AS database_connection")

        return jsonify({
            "success": True,
            "application": "PIVOT",
            "database": "connected",
        })

    except (sqlite3.Error, FileNotFoundError):

        return jsonify({
            "success": False,
            "database": "unavailable",
        }), 503


# =====================================================
# 16. APPLICATION ENTRY POINT
# =====================================================

if __name__ == "__main__":

    print("\n" + "=" * 48)
    print("PIVOT — SALES INTELLIGENCE")
    print("=" * 48)

    print(f"Database: {DATABASE_PATH}")
    print("Local URL: http://127.0.0.1:5000")
    print("API:       http://127.0.0.1:5000/api/dashboard")

    print("=" * 48 + "\n")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
    )
