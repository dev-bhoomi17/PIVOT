
-- =========================================================
-- PIVOT — SALES INTELLIGENCE
-- SQL ANALYTICS AND AGGREGATION QUERIES
-- Database: SQLite
-- Revenue is calculated after item-level discounts.
-- Only completed orders are included in sales reporting.
-- =========================================================


-- =========================================================
-- QUERY 1: REVENUE BY PRODUCT CATEGORY
-- Business question:
-- Which product categories generate the most revenue?
--
-- SQL concepts:
-- SUM, AVG, COUNT, GROUP BY, HAVING, ORDER BY
-- =========================================================

SELECT
    c.category_name,
    ROUND(
        SUM(
            oi.quantity * oi.unit_price *
            (1 - oi.discount_pct)
        ), 2
    ) AS total_revenue,

    SUM(oi.quantity) AS total_units_sold,

    COUNT(DISTINCT o.order_id) AS total_orders,

    ROUND(
        AVG(oi.unit_price * (1 - oi.discount_pct)), 2
    ) AS average_selling_price

FROM order_items AS oi

INNER JOIN orders AS o
    ON oi.order_id = o.order_id

INNER JOIN products AS p
    ON oi.product_id = p.product_id

INNER JOIN categories AS c
    ON p.category_id = c.category_id

WHERE o.order_status = 'completed'

GROUP BY
    c.category_id,
    c.category_name

HAVING
    SUM(
        oi.quantity * oi.unit_price *
        (1 - oi.discount_pct)
    ) >= 1000000

ORDER BY total_revenue DESC;


-- =========================================================
-- QUERY 2: AVERAGE ORDER VALUE BY REGION
-- Business question:
-- Which geographical region has the highest
-- average order value?
--
-- Important:
-- Calculate revenue for each individual order first,
-- then calculate the regional average.
-- =========================================================

WITH order_totals AS (

    SELECT
        o.order_id,
        c.region,

        SUM(
            oi.quantity * oi.unit_price *
            (1 - oi.discount_pct)
        ) AS order_revenue

    FROM orders AS o

    INNER JOIN customers AS c
        ON o.customer_id = c.customer_id

    INNER JOIN order_items AS oi
        ON o.order_id = oi.order_id

    WHERE o.order_status = 'completed'

    GROUP BY
        o.order_id,
        c.region
)

SELECT
    region,

    COUNT(*) AS total_orders,

    ROUND(SUM(order_revenue), 2) AS total_revenue,

    ROUND(AVG(order_revenue), 2)
        AS average_order_value,

    ROUND(MIN(order_revenue), 2)
        AS smallest_order_value,

    ROUND(MAX(order_revenue), 2)
        AS largest_order_value

FROM order_totals

GROUP BY region

HAVING COUNT(*) >= 20

ORDER BY average_order_value DESC;


-- =========================================================
-- QUERY 3: MONTHLY SALES TRENDS
-- Business question:
-- How does revenue change month by month?
--
-- SQL concepts:
-- strftime, SUM, AVG, COUNT, GROUP BY
-- =========================================================

WITH order_totals AS (

    SELECT
        o.order_id,
        o.order_date,

        SUM(
            oi.quantity * oi.unit_price *
            (1 - oi.discount_pct)
        ) AS order_revenue

    FROM orders AS o

    INNER JOIN order_items AS oi
        ON o.order_id = oi.order_id

    WHERE o.order_status = 'completed'

    GROUP BY
        o.order_id,
        o.order_date
)

SELECT
    strftime('%Y-%m', order_date) AS sales_month,

    COUNT(*) AS total_orders,

    ROUND(SUM(order_revenue), 2) AS monthly_revenue,

    ROUND(AVG(order_revenue), 2)
        AS average_order_value

FROM order_totals

GROUP BY sales_month

ORDER BY sales_month ASC;


-- =========================================================
-- QUERY 4: PRODUCT PERFORMANCE ANALYSIS
-- Business question:
-- Which products are performing best?
--
-- SQL concepts:
-- SUM, AVG, COUNT, MIN, MAX, GROUP BY
-- =========================================================

SELECT
    p.product_id,
    p.product_name,
    c.category_name,

    SUM(oi.quantity) AS units_sold,

    COUNT(DISTINCT o.order_id) AS orders_count,

    ROUND(
        SUM(
            oi.quantity * oi.unit_price *
            (1 - oi.discount_pct)
        ), 2
    ) AS total_revenue,

    ROUND(
        AVG(oi.unit_price * (1 - oi.discount_pct)), 2
    ) AS average_selling_price,

    ROUND(
        MIN(oi.unit_price * (1 - oi.discount_pct)), 2
    ) AS minimum_selling_price,

    ROUND(
        MAX(oi.unit_price * (1 - oi.discount_pct)), 2
    ) AS maximum_selling_price

FROM order_items AS oi

INNER JOIN orders AS o
    ON oi.order_id = o.order_id

INNER JOIN products AS p
    ON oi.product_id = p.product_id

INNER JOIN categories AS c
    ON p.category_id = c.category_id

WHERE o.order_status = 'completed'

GROUP BY
    p.product_id,
    p.product_name,
    c.category_name

ORDER BY total_revenue DESC;


-- =========================================================
-- QUERY 5: HIGH-VALUE ORDERS
-- Business question:
-- Which individual orders generated substantial revenue?
--
-- SQL concepts:
-- SUM, COUNT, GROUP BY, HAVING
-- =========================================================

SELECT
    o.order_id,
    o.order_date,
    cu.customer_name,
    cu.region,

    COUNT(oi.item_id) AS distinct_order_lines,

    SUM(oi.quantity) AS total_units,

    ROUND(
        SUM(
            oi.quantity * oi.unit_price *
            (1 - oi.discount_pct)
        ), 2
    ) AS order_revenue

FROM orders AS o

INNER JOIN customers AS cu
    ON o.customer_id = cu.customer_id

INNER JOIN order_items AS oi
    ON o.order_id = oi.order_id

WHERE o.order_status = 'completed'

GROUP BY
    o.order_id,
    o.order_date,
    cu.customer_name,
    cu.region

HAVING
    SUM(
        oi.quantity * oi.unit_price *
        (1 - oi.discount_pct)
    ) >= 10000

ORDER BY order_revenue DESC

LIMIT 20;


-- =========================================================
-- QUERY 6: REGIONAL CATEGORY PERFORMANCE
-- Business question:
-- Which product categories perform well in each region?
--
-- SQL concepts:
-- Multiple JOINs, SUM, COUNT, GROUP BY, HAVING
-- =========================================================

SELECT
    cu.region,
    c.category_name,

    COUNT(DISTINCT o.order_id) AS total_orders,

    SUM(oi.quantity) AS units_sold,

    ROUND(
        SUM(
            oi.quantity * oi.unit_price *
            (1 - oi.discount_pct)
        ), 2
    ) AS category_revenue

FROM orders AS o

INNER JOIN customers AS cu
    ON o.customer_id = cu.customer_id

INNER JOIN order_items AS oi
    ON o.order_id = oi.order_id

INNER JOIN products AS p
    ON oi.product_id = p.product_id

INNER JOIN categories AS c
    ON p.category_id = c.category_id

WHERE o.order_status = 'completed'

GROUP BY
    cu.region,
    c.category_id,
    c.category_name

HAVING COUNT(DISTINCT o.order_id) >= 20

ORDER BY
    cu.region,
    category_revenue DESC;


-- =========================================================
-- QUERY 7: ORDER STATUS SUMMARY
-- Business question:
-- How are orders distributed across different statuses?
--
-- SQL concepts:
-- COUNT, MIN, MAX, GROUP BY
--
-- Revenue is shown only for completed orders.
-- Cancelled and pending orders are not counted as sales.
-- =========================================================

SELECT
    order_status,

    COUNT(*) AS total_orders,

    MIN(order_date) AS first_order_date,

    MAX(order_date) AS latest_order_date

FROM orders

GROUP BY order_status

ORDER BY total_orders DESC;
