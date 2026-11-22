
# PIVOT — Sales Intelligence Dashboard

**Turn transactions into decisions.**

PIVOT is an interactive sales intelligence dashboard that transforms fictional retail transaction data into actionable business insights using SQL aggregations, Python, Flask, and SQLite.

The application combines a custom-designed analytics interface with a real SQL-powered backend. Dashboard metrics, charts, regional comparisons, and product rankings are calculated from database queries rather than hardcoded figures.

## Project Overview

PIVOT helps explore:

- Overall sales revenue and order performance.
- Monthly revenue trends.
- Product category contributions.
- Regional sales performance.
- Top-performing products.
- High-value customer transactions.

## Technology Stack

| Technology | Application |
|---|---|
| Python | Backend logic |
| Flask | Web application and REST API |
| SQLite | Relational database |
| SQL | Aggregations and business analysis |
| HTML5 | Dashboard structure |
| CSS3 | Custom styling and responsive UI |
| JavaScript | Interactive charts, filters and tables |
| SVG | Revenue and category visualizations |
| Pytest | Automated testing |

## Key Features

### 1. Sales KPI Overview
- Total revenue.
- Completed orders.
- Average order value.
- Units sold.
- Unique customers.
- Animated numerical indicators.

### 2. Revenue Intelligence
- Monthly revenue trend.
- Interactive SVG area chart.
- Hover-based data tooltips.
- Dynamic date filtering.

### 3. Category Analytics
- Revenue distribution by category.
- Custom SVG donut chart.
- Category contribution percentages.
- SQL HAVING threshold filtering.

### 4. Regional Intelligence
- Revenue comparison across six regions.
- Average order value by region.
- Ranked regional performance.
- Top-performing region highlight.

### 5. Product Intelligence
- Top ten products by revenue.
- Units sold and order counts.
- Average selling price.
- Searchable product table.

### 6. Transaction Analysis
- High-value completed orders.
- Customer and regional information.
- Order quantities and revenue.
- SQL-based order aggregation.

### 7. Interactive Filters
- Start and end dates.
- Region selection.
- Product category selection.
- Minimum category revenue.
- Apply and reset controls.

All filters trigger new database queries through the Flask API.

## SQL Concepts Demonstrated

The project includes seven documented analytical SQL queries.

| Query | Business Analysis | SQL Concepts |
|---|---|---|
| 1 | Revenue by category | SUM, AVG, COUNT, GROUP BY, HAVING |
| 2 | Average order value by region | AVG, SUM, MIN, MAX, GROUP BY |
| 3 | Monthly sales trends | SUM, AVG, COUNT, GROUP BY |
| 4 | Product performance | SUM, AVG, COUNT, MIN, MAX |
| 5 | High-value orders | SUM, COUNT, GROUP BY, HAVING |
| 6 | Regional category performance | SUM, COUNT, multiple GROUP BY dimensions |
| 7 | Order status summary | COUNT, MIN, MAX, GROUP BY |

Additional SQL techniques include:
- INNER JOIN
- Common Table Expressions (CTEs)
- DATE formatting with SQLite `strftime`
- Parameterized SQL queries
- Aggregate filtering using HAVING
- Database indexes

## Database Design

The SQLite database uses five relational tables:

```text
categories
    |
    | 1-to-many
    v
products
    |
    | 1-to-many
    v
order_items
    ^
    | many-to-1
orders
    |
    | many-to-1
    v
customers
```

### Dataset

The reproducible fictional dataset includes:

| Table | Records |
|---|---:|
| Categories | 6 |
| Products | 24 |
| Customers | 250 |
| Orders | 1,800 |
| Order items | Generated transactions |

Transactions span January through December 2025.

Order statuses include completed, pending, and cancelled.

Only completed orders contribute to reported sales revenue.

All names and transactions are fictional.

## Project Structure

```text
PIVOT/
│
├── app.py
├── requirements.txt
├── README.md
├── .gitignore
│
├── database/
│   ├── schema.sql
│   └── seed.py
│
├── queries/
│   └── sales_summary.sql
│
├── data/
│   └── pivot.db
│
├── templates/
│   └── index.html
│
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
│
├── scripts/
│   └── verify_queries.py
│
└── tests/
    └── test_app.py
```

The generated database is excluded from Git and can be recreated using the seeding script.

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/PIVOT.git
cd PIVOT
```

### 2. Create a virtual environment

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Generate the SQLite database

```bash
python database/seed.py
```

### 5. Start the Flask application

```bash
python app.py
```

Open the dashboard:

```text
http://127.0.0.1:5000
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `/` | Dashboard homepage |
| `/api/health` | Database health check |
| `/api/filters` | Available date, region and category options |
| `/api/dashboard` | Aggregated dashboard results |

Example filtered request:

```text
/api/dashboard?region=North&category=Electronics&min_revenue=0
```

Optional date parameters:

```text
/api/dashboard?start_date=2025-01-01&end_date=2025-06-30
```

## Testing

Run the automated test suite:

```bash
python -m pytest -v
```

The current implementation has **14 passing automated tests**.

Test coverage includes:
- Homepage rendering.
- Database connectivity.
- Filter options.
- KPI accuracy.
- Monthly revenue reconciliation.
- Region and category filtering.
- HAVING threshold filtering.
- Date and input validation.
- Product ranking.
- High-value orders.
- SQL injection input rejection.

## Design Philosophy

PIVOT uses an editorial-inspired business intelligence interface.

**Primary palette**
- Midnight Navy — `#17233C`
- Electric Blue — `#526DFF`
- Tangerine Coral — `#FF956B`
- Soft Lavender — `#E9E8FF`
- Mint — `#CDEFD9`
- Warm Ivory — `#F7F7F2`

The responsive interface combines custom SVG data visualizations, restrained animations, hover feedback, clear hierarchy, and accessible interaction states.

## Learning Outcomes

This project demonstrates:

- Designing relational databases.
- Writing SQL aggregation and grouping queries.
- Applying HAVING to aggregated results.
- Calculating accurate average order values.
- Building dynamic Flask APIs.
- Integrating SQLite with a web application.
- Developing interactive data visualizations.
- Implementing responsive frontend interfaces.
- Writing automated backend tests.

## Dataset Notice

PIVOT is an educational demonstration project. It uses fictional retail data and does not connect to an actual company, payment system, or live sales database.

---

**PIVOT — Numbers tell stories. Find yours.**
