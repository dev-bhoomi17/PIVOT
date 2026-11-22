
import pytest

from app import app


@pytest.fixture
def client():
    app.config.update(TESTING=True)

    with app.test_client() as test_client:
        yield test_client


def test_homepage_loads(client):
    response = client.get("/")

    assert response.status_code == 200
    assert b"PIVOT" in response.data


def test_database_health(client):
    response = client.get("/api/health")

    assert response.status_code == 200

    data = response.get_json()

    assert data["success"] is True
    assert data["database"] == "connected"


def test_filter_options(client):
    response = client.get("/api/filters")

    assert response.status_code == 200

    filters = response.get_json()["filters"]

    assert len(filters["regions"]) == 6
    assert len(filters["categories"]) == 6
    assert filters["minimum_date"] == "2025-01-01"


def test_default_dashboard_summary(client):
    response = client.get("/api/dashboard")

    assert response.status_code == 200

    data = response.get_json()

    assert data["success"] is True
    assert data["summary"]["total_orders"] == 1612
    assert data["summary"]["total_revenue"] == pytest.approx(
        28009924.55, abs=0.01
    )

    assert data["summary"]["units_sold"] == 12013


def test_monthly_revenue_reconciles(client):
    response = client.get("/api/dashboard")

    data = response.get_json()

    monthly_total = sum(
        row["monthly_revenue"]
        for row in data["monthly_sales"]
    )

    assert monthly_total == pytest.approx(
        data["summary"]["total_revenue"],
        abs=0.02
    )

    assert len(data["monthly_sales"]) == 12


def test_region_filter(client):
    response = client.get(
        "/api/dashboard?region=North"
    )

    assert response.status_code == 200

    data = response.get_json()

    assert len(data["regional_sales"]) == 1
    assert data["regional_sales"][0]["region"] == "North"


def test_category_filter(client):
    response = client.get(
        "/api/dashboard?category=Electronics"
    )

    assert response.status_code == 200

    data = response.get_json()

    assert len(data["category_sales"]) == 1
    assert data["category_sales"][0]["category_name"] == "Electronics"


def test_minimum_revenue_having_filter(client):
    response = client.get(
        "/api/dashboard?min_revenue=5000000"
    )

    assert response.status_code == 200

    categories = response.get_json()["category_sales"]

    for category in categories:
        assert category["total_revenue"] >= 5000000


def test_invalid_date_range(client):
    response = client.get(
        "/api/dashboard?start_date=2025-12-31&end_date=2025-01-01"
    )

    assert response.status_code == 400


def test_invalid_region(client):
    response = client.get(
        "/api/dashboard?region=InvalidRegion"
    )

    assert response.status_code == 400


def test_invalid_revenue_threshold(client):
    response = client.get(
        "/api/dashboard?min_revenue=invalid"
    )

    assert response.status_code == 400


def test_top_products(client):
    response = client.get("/api/dashboard")

    data = response.get_json()

    products = data["top_products"]

    assert len(products) == 10

    revenues = [
        product["total_revenue"]
        for product in products
    ]

    assert revenues == sorted(revenues, reverse=True)


def test_high_value_orders(client):
    response = client.get("/api/dashboard")

    orders = response.get_json()["high_value_orders"]

    assert len(orders) <= 10

    for order in orders:
        assert order["order_revenue"] >= 10000


def test_invalid_region_injection_rejected(client):
    response = client.get(
        "/api/dashboard?region=North%27%20OR%201%3D1--"
    )

    assert response.status_code == 400
