
"use strict";

/* =========================================================
   PIVOT — SALES INTELLIGENCE
   Frontend interaction and visualization engine
   Data source: Flask API + SQLite SQL aggregations
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    // =====================================================
    // 01. DOM HELPERS
    // =====================================================

    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    const SVG_NS = "http://www.w3.org/2000/svg";

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    const elements = {

        main: $(".main-content"),
        sidebar: $("#sidebar"),
        menuButton: $("#mobileMenuButton"),

        loading: $("#loadingOverlay"),
        refresh: $("#refreshButton"),

        currentDate: $("#currentDate"),

        startDate: $("#startDate"),
        endDate: $("#endDate"),
        region: $("#regionSelect"),
        category: $("#categorySelect"),
        minRevenue: $("#minRevenue"),

        applyFilters: $("#applyFilters"),
        resetFilters: $("#resetFilters"),
        filterFeedback: $("#filterFeedback"),

        totalRevenue: $("#totalRevenue"),
        totalOrders: $("#totalOrders"),
        averageOrderValue: $("#averageOrderValue"),
        unitsSold: $("#unitsSold"),
        totalCustomers: $("#totalCustomers"),

        revenueChart: $("#revenueChart"),
        revenueGrid: $("#revenueGrid"),
        revenueLine: $("#revenueLine"),
        revenueArea: $("#revenueArea"),
        revenuePoints: $("#revenuePoints"),
        revenueXAxis: $("#revenueXAxis"),
        revenueYAxis: $("#revenueYAxis"),
        revenueTooltip: $("#revenueTooltip"),
        revenueTooltipValue: $("#revenueTooltipValue"),
        revenueTooltipLabel: $("#revenueTooltipLabel"),
        chartTotalRevenue: $("#chartTotalRevenue"),
        chartPeriodLabel: $("#chartPeriodLabel"),
        revenueInsight: $("#revenueInsight"),

        categorySegments: $("#categoryDonutSegments"),
        categoryLegend: $("#categoryLegend"),
        categoryDonutTotal: $("#categoryDonutTotal"),

        regionBars: $("#regionBars"),
        topRegionName: $("#topRegionName"),
        topRegionRevenue: $("#topRegionRevenue"),
        topRegionOrders: $("#topRegionOrders"),

        productSearch: $("#productSearch"),
        productCount: $("#productCount"),
        productTableBody: $("#productTableBody"),
        productTableFooter: $("#productTableFooter"),

        orderCount: $("#orderCount"),
        orderTableBody: $("#orderTableBody"),

        insightTitle: $("#insightTitle"),
        insightDescription: $("#insightDescription"),

        toastContainer: $("#toastContainer")
    };


    // =====================================================
    // 02. APPLICATION STATE
    // =====================================================

    let filterOptions = null;
    let dashboardData = null;
    let isLoading = false;

    let productRows = [];

    let currentRequestNumber = 0;

    const chartDimensions = {
        width: 760,
        height: 245,
        left: 15,
        right: 12,
        top: 12,
        bottom: 12
    };

    const categoryColors = [
        "#526DFF",
        "#FF956B",
        "#9D91E9",
        "#79BB99",
        "#83B8CE",
        "#E6BF79"
    ];


    // =====================================================
    // 03. NUMBER AND CURRENCY FORMATTERS
    // =====================================================

    const numberFormatter = new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 0
    });

    const currencyFormatter = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    });

    const decimalCurrencyFormatter = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });


    function formatNumber(value) {

        return numberFormatter.format(
            Number(value) || 0
        );
    }


    function formatCurrency(value) {

        return currencyFormatter.format(
            Number(value) || 0
        );
    }


    function formatPreciseCurrency(value) {

        return decimalCurrencyFormatter.format(
            Number(value) || 0
        );
    }


    function formatCompactCurrency(value) {

        const amount = Number(value) || 0;

        if (amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(2)} Cr`;
        }

        if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(2)} L`;
        }

        if (amount >= 1000) {
            return `₹${(amount / 1000).toFixed(1)} K`;
        }

        return `₹${formatNumber(amount)}`;
    }


    function formatAxisCurrency(value) {

        const amount = Number(value) || 0;

        if (amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(1)}Cr`;
        }

        if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(1)}L`;
        }

        if (amount >= 1000) {
            return `₹${(amount / 1000).toFixed(0)}K`;
        }

        return `₹${formatNumber(amount)}`;
    }


    function formatMonth(monthString) {

        const [year, month] = monthString.split("-").map(Number);

        const date = new Date(year, month - 1, 1);

        return new Intl.DateTimeFormat("en-IN", {
            month: "short"
        }).format(date);
    }


    function formatDate(dateString) {

        const date = new Date(`${dateString}T00:00:00`);

        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(date);
    }


    // =====================================================
    // 04. SAFE DOM CREATION HELPERS
    // =====================================================

    function createElement(tag, className, text) {

        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined && text !== null) {
            element.textContent = String(text);
        }

        return element;
    }


    function createSvgElement(tag, attributes = {}) {

        const element = document.createElementNS(
            SVG_NS,
            tag
        );

        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, String(value));
        });

        return element;
    }


    function showEmptyMessage(container, message, className = "empty-cell") {

        if (!container) return;

        container.replaceChildren();

        const empty = createElement("div", className, message);

        container.appendChild(empty);
    }


    // =====================================================
    // 05. TOAST NOTIFICATIONS
    // =====================================================

    function showToast(message, type = "success") {

        if (!elements.toastContainer) return;

        const toast = createElement(
            "div",
            `toast ${type}`,
            message
        );

        elements.toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add("visible");
        });

        window.setTimeout(() => {

            toast.classList.remove("visible");

            window.setTimeout(() => {
                toast.remove();
            }, 250);

        }, 2800);
    }


    // =====================================================
    // 06. LOADING STATES
    // =====================================================

    function hideInitialLoader() {

        elements.loading?.classList.add("hidden");
    }


    function setUpdatingState(updating) {

        if (elements.main) {
            elements.main.classList.toggle(
                "is-updating",
                updating
            );
        }

        if (elements.applyFilters) {
            elements.applyFilters.disabled = updating;
        }

        if (elements.refresh) {
            elements.refresh.disabled = updating;
        }
    }


    // =====================================================
    // 07. API REQUEST HELPER
    // =====================================================

    async function apiRequest(url) {

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store"
        });

        let result;

        try {
            result = await response.json();

        } catch {
            throw new Error("The server returned an invalid response.");
        }

        if (!response.ok || result.success === false) {

            throw new Error(
                result.error || `Request failed (${response.status}).`
            );
        }

        return result;
    }


    // =====================================================
    // 08. CURRENT DATE
    // =====================================================

    function updateCurrentDate() {

        if (!elements.currentDate) return;

        elements.currentDate.textContent =
            new Intl.DateTimeFormat("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric"
            }).format(new Date());
    }


    // =====================================================
    // 09. INITIALIZE FILTER OPTIONS
    // =====================================================

    async function loadFilterOptions() {

        const result = await apiRequest("/api/filters");

        filterOptions = result.filters;

        elements.startDate.min = filterOptions.minimum_date;
        elements.startDate.max = filterOptions.maximum_date;

        elements.endDate.min = filterOptions.minimum_date;
        elements.endDate.max = filterOptions.maximum_date;

        elements.startDate.value = filterOptions.minimum_date;
        elements.endDate.value = filterOptions.maximum_date;


        // Populate regions
        filterOptions.regions.forEach(region => {

            const option = createElement(
                "option",
                "",
                region
            );

            option.value = region;

            elements.region.appendChild(option);
        });


        // Populate categories
        filterOptions.categories.forEach(category => {

            const option = createElement(
                "option",
                "",
                category
            );

            option.value = category;

            elements.category.appendChild(option);
        });

    }


    // =====================================================
    // 10. READ FILTER VALUES
    // =====================================================

    function getCurrentFilters() {

        return {
            start_date: elements.startDate.value,
            end_date: elements.endDate.value,
            region: elements.region.value,
            category: elements.category.value,
            min_revenue: elements.minRevenue.value
        };
    }


    function validateFilters(filters) {

        if (!filters.start_date || !filters.end_date) {

            throw new Error("Please select both dates.");
        }

        if (filters.start_date > filters.end_date) {

            throw new Error(
                "Start date cannot be later than end date."
            );
        }

        return true;
    }


    function buildDashboardUrl(filters) {

        const query = new URLSearchParams(filters);

        return `/api/dashboard?${query.toString()}`;
    }


    // =====================================================
    // 11. ANIMATED KPI NUMBERS
    // =====================================================

    function animateNumber(element, target, formatter) {

        if (!element) return;

        const finalValue = Number(target) || 0;

        if (reducedMotion) {

            element.textContent = formatter(finalValue);

            return;
        }

        const duration = 850;
        const startTime = performance.now();

        function update(timestamp) {

            const progress = Math.min(
                (timestamp - startTime) / duration,
                1
            );

            const eased = 1 - Math.pow(1 - progress, 3);

            const currentValue = finalValue * eased;

            element.textContent = formatter(currentValue);

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = formatter(finalValue);
            }
        }

        requestAnimationFrame(update);
    }


    // =====================================================
    // 12. UPDATE KPI CARDS
    // =====================================================

    function renderKpis(summary) {

        animateNumber(
            elements.totalRevenue,
            summary.total_revenue,
            formatCompactCurrency
        );

        animateNumber(
            elements.totalOrders,
            summary.total_orders,
            formatNumber
        );

        animateNumber(
            elements.averageOrderValue,
            summary.average_order_value,
            formatCurrency
        );

        animateNumber(
            elements.unitsSold,
            summary.units_sold,
            formatNumber
        );

        animateNumber(
            elements.totalCustomers,
            summary.total_customers,
            formatNumber
        );
    }


    // =====================================================
    // 13. REVENUE CHART COORDINATES
    // =====================================================

    function getChartPoints(monthlyData) {

        const values = monthlyData.map(row =>
            Number(row.monthly_revenue) || 0
        );

        const maximum = Math.max(...values, 0);

        const chartMax = Math.max(
            1000,
            Math.ceil(maximum * 1.18 / 4 / 1000) * 4000
        );

        const usableWidth =
            chartDimensions.width -
            chartDimensions.left -
            chartDimensions.right;

        const usableHeight =
            chartDimensions.height -
            chartDimensions.top -
            chartDimensions.bottom;

        const points = monthlyData.map((row, index) => {

            const x = monthlyData.length === 1
                ? chartDimensions.width / 2
                : chartDimensions.left +
                  (index / (monthlyData.length - 1)) * usableWidth;

            const y = chartDimensions.height -
                chartDimensions.bottom -
                (
                    (Number(row.monthly_revenue) || 0) /
                    chartMax
                ) * usableHeight;

            return {
                x,
                y,
                value: Number(row.monthly_revenue) || 0,
                label: row.sales_month
            };
        });

        return {
            points,
            maximum,
            chartMax
        };
    }


    // =====================================================
    // 14. SMOOTH SVG CHART PATH
    // =====================================================

    function createSmoothPath(points) {

        if (!points.length) return "";

        if (points.length === 1) {

            return `M ${points[0].x} ${points[0].y}`;
        }

        let path = `M ${points[0].x} ${points[0].y}`;

        for (let i = 0; i < points.length - 1; i++) {

            const previous = points[Math.max(0, i - 1)];
            const current = points[i];
            const next = points[i + 1];
            const after = points[Math.min(points.length - 1, i + 2)];

            const controlOneX =
                current.x + (next.x - previous.x) / 6;

            const controlOneY =
                current.y + (next.y - previous.y) / 6;

            const controlTwoX =
                next.x - (after.x - current.x) / 6;

            const controlTwoY =
                next.y - (after.y - current.y) / 6;

            path +=
                ` C ${controlOneX} ${controlOneY}` +
                ` ${controlTwoX} ${controlTwoY}` +
                ` ${next.x} ${next.y}`;
        }

        return path;
    }


    // =====================================================
    // 15. REVENUE CHART TOOLTIP
    // =====================================================

    function showRevenueTooltip(point) {

        if (!elements.revenueTooltip) return;

        const chartContent = $(".revenue-chart-content");

        if (!chartContent) return;

        const positionX =
            (point.x / chartDimensions.width) *
            chartContent.clientWidth;

        const positionY =
            (point.y / chartDimensions.height) *
            chartContent.clientHeight;

        const tooltipWidth = 135;

        const safeX = Math.max(
            tooltipWidth / 2,
            Math.min(
                chartContent.clientWidth - tooltipWidth / 2,
                positionX
            )
        );

        elements.revenueTooltip.style.left = `${safeX}px`;

        elements.revenueTooltip.style.top =
            `${Math.max(5, positionY)}px`;

        elements.revenueTooltipValue.textContent =
            formatPreciseCurrency(point.value);

        elements.revenueTooltipLabel.textContent =
            formatMonth(point.label) + " " + point.label.slice(0, 4);

        elements.revenueTooltip.classList.add("visible");
    }


    function hideRevenueTooltip() {

        elements.revenueTooltip?.classList.remove("visible");
    }


    // =====================================================
    // 16. EMPTY REVENUE CHART
    // =====================================================

    function renderEmptyRevenueChart() {

        elements.revenueLine?.setAttribute("d", "");
        elements.revenueArea?.setAttribute("d", "");

        elements.revenuePoints?.replaceChildren();
        elements.revenueGrid?.replaceChildren();

        elements.revenueXAxis?.replaceChildren();
        elements.revenueYAxis?.replaceChildren();

        hideRevenueTooltip();

        const gridLabels = [0, 0, 0, 0, 0];

        gridLabels.forEach(() => {

            const label = createElement("span", "", "₹0");

            elements.revenueYAxis.appendChild(label);
        });

        const empty = createElement(
            "span",
            "chart-empty",
            "No revenue data exists for this selection."
        );

        elements.revenueXAxis.appendChild(empty);
    }


    // =====================================================
    // 17. DRAW REVENUE GRID
    // =====================================================

    function renderRevenueGrid(chartMax) {

        const {
            width,
            height,
            left,
            right,
            top,
            bottom
        } = chartDimensions;

        elements.revenueGrid.replaceChildren();
        elements.revenueYAxis.replaceChildren();

        for (let i = 0; i <= 4; i++) {

            const y = top +
                (i / 4) * (height - top - bottom);

            const line = createSvgElement("line", {
                x1: left,
                x2: width - right,
                y1: y,
                y2: y
            });

            elements.revenueGrid.appendChild(line);

            const value = chartMax * (1 - i / 4);

            const label = createElement(
                "span",
                "",
                formatAxisCurrency(value)
            );

            elements.revenueYAxis.appendChild(label);
        }
    }


    // =====================================================
    // 18. RENDER REVENUE CHART
    // =====================================================

    function renderRevenueChart(monthlyData) {

        if (
            !elements.revenueChart ||
            !elements.revenueLine ||
            !elements.revenueArea
        ) {
            return;
        }

        if (!monthlyData || monthlyData.length === 0) {

            renderEmptyRevenueChart();

            elements.chartTotalRevenue.textContent = "₹0";

            elements.revenueInsight.textContent =
                "No monthly sales records match the selected filters.";

            return;
        }

        const {
            points,
            chartMax
        } = getChartPoints(monthlyData);

        const linePath = createSmoothPath(points);

        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];

        elements.revenueLine.setAttribute("d", linePath);

        const bottomY =
            chartDimensions.height - chartDimensions.bottom;

        const areaPath = points.length === 1
            ? `${linePath} L ${firstPoint.x} ${bottomY} Z`
            : `${linePath} L ${lastPoint.x} ${bottomY} L ${firstPoint.x} ${bottomY} Z`;

        elements.revenueArea.setAttribute("d", areaPath);

        renderRevenueGrid(chartMax);


        // Animate chart line
        if (!reducedMotion && points.length > 1) {

            try {

                const pathLength =
                    elements.revenueLine.getTotalLength();

                elements.revenueLine.style.transition = "none";

                elements.revenueLine.style.strokeDasharray =
                    pathLength;

                elements.revenueLine.style.strokeDashoffset =
                    pathLength;

                elements.revenueLine.getBoundingClientRect();

                requestAnimationFrame(() => {

                    elements.revenueLine.style.transition =
                        "stroke-dashoffset 900ms ease";

                    elements.revenueLine.style.strokeDashoffset = "0";
                });

            } catch (error) {

                console.warn("Chart line animation unavailable:", error);
            }

        } else {

            elements.revenueLine.style.strokeDasharray = "none";
            elements.revenueLine.style.strokeDashoffset = "0";
        }


        // Create interactive chart points
        elements.revenuePoints.replaceChildren();

        points.forEach((point, index) => {

            const isLast = index === points.length - 1;

            const circle = createSvgElement("circle", {
                cx: point.x,
                cy: point.y,
                r: isLast ? 6 : 4.5,
                fill: "#ffffff",
                stroke: "#526DFF",
                "stroke-width": isLast ? 3.5 : 2.5,
                tabindex: 0,
                role: "img",
                "aria-label":
                    `${formatMonth(point.label)}: ${formatPreciseCurrency(point.value)}`
            });

            const showTooltip = () => {
                showRevenueTooltip(point);
            };

            circle.addEventListener("mouseenter", showTooltip);
            circle.addEventListener("focus", showTooltip);
            circle.addEventListener("mouseleave", hideRevenueTooltip);
            circle.addEventListener("blur", hideRevenueTooltip);

            const svgTitle = createSvgElement("title");

            svgTitle.textContent =
                `${formatMonth(point.label)}: ${formatPreciseCurrency(point.value)}`;

            circle.appendChild(svgTitle);

            elements.revenuePoints.appendChild(circle);
        });


        // Update x-axis labels
        elements.revenueXAxis.replaceChildren();

        monthlyData.forEach(row => {

            const label = createElement(
                "span",
                "",
                formatMonth(row.sales_month)
            );

            label.title = row.sales_month;

            elements.revenueXAxis.appendChild(label);
        });


        // Total revenue displayed in chart header
        const chartTotal = monthlyData.reduce(
            (sum, row) => sum + Number(row.monthly_revenue || 0),
            0
        );

        elements.chartTotalRevenue.textContent =
            formatCompactCurrency(chartTotal);


        // Year / date range
        const filters = getCurrentFilters();

        const startYear = filters.start_date.slice(0, 4);
        const endYear = filters.end_date.slice(0, 4);

        elements.chartPeriodLabel.textContent =
            startYear === endYear
                ? startYear
                : `${startYear} – ${endYear}`;


        // Revenue insight
        const highestMonth = monthlyData.reduce(
            (highest, current) =>
                Number(current.monthly_revenue) >
                Number(highest.monthly_revenue)
                    ? current
                    : highest
        );

        elements.revenueInsight.textContent =
            `Revenue peaked in ${formatMonth(highestMonth.sales_month)} ` +
            `at ${formatPreciseCurrency(highestMonth.monthly_revenue)}. ` +
            `Explore the category and regional breakdowns to understand the drivers.`;

        hideRevenueTooltip();
    }


    // =====================================================
    // 19. CATEGORY DONUT CHART
    // =====================================================

    function renderCategoryChart(categories) {

        if (!elements.categorySegments) return;

        elements.categorySegments.replaceChildren();
        elements.categoryLegend.replaceChildren();

        if (!categories || categories.length === 0) {

            elements.categoryDonutTotal.textContent = "₹0";

            const empty = createElement(
                "div",
                "chart-empty",
                "No categories meet the selected revenue threshold."
            );

            elements.categoryLegend.appendChild(empty);

            return;
        }

        const total = categories.reduce(
            (sum, row) => sum + Number(row.total_revenue || 0),
            0
        );

        elements.categoryDonutTotal.textContent =
            formatCompactCurrency(total);

        const label = $(".donut-center span");

        if (label) {
            label.textContent = "CATEGORY REVENUE";
        }

        const radius = 78;
        const circumference = 2 * Math.PI * radius;

        let currentOffset = 0;

        categories.forEach((row, index) => {

            const value = Number(row.total_revenue) || 0;

            const proportion = total > 0
                ? value / total
                : 0;

            const segmentLength = proportion * circumference;

            const color = categoryColors[
                index % categoryColors.length
            ];

            const circle = createSvgElement("circle", {

                cx: 110,
                cy: 110,
                r: radius,

                stroke: color,

                "stroke-dasharray":
                    `${Math.max(0, segmentLength - 2)} ${circumference}`,

                "stroke-dashoffset": -currentOffset,

                tabindex: 0,
                role: "img",

                "aria-label":
                    `${row.category_name}: ${formatPreciseCurrency(value)}, ` +
                    `${(proportion * 100).toFixed(1)} percent`
            });

            const title = createSvgElement("title");

            title.textContent =
                `${row.category_name}: ${formatPreciseCurrency(value)}`;

            circle.appendChild(title);

            elements.categorySegments.appendChild(circle);


            // Category legend row
            const legendRow = createElement(
                "div",
                "category-legend-row"
            );

            const name = createElement(
                "div",
                "category-legend-name"
            );

            const swatch = createElement(
                "span",
                "category-legend-color"
            );

            swatch.style.background = color;

            const categoryName = createElement(
                "span",
                "",
                row.category_name
            );

            name.append(swatch, categoryName);

            const amount = createElement(
                "strong",
                "category-legend-value",
                formatCompactCurrency(value)
            );

            const percent = createElement(
                "span",
                "category-legend-percent",
                `${(proportion * 100).toFixed(1)}%`
            );

            legendRow.append(name, amount, percent);

            elements.categoryLegend.appendChild(legendRow);

            currentOffset += segmentLength;
        });
    }


    // =====================================================
    // 20. REGIONAL PERFORMANCE BARS
    // =====================================================

    function renderRegionalChart(regions) {

        elements.regionBars.replaceChildren();

        if (!regions || regions.length === 0) {

            showEmptyMessage(
                elements.regionBars,
                "No regional records match the selected filters.",
                "chart-empty"
            );

            elements.topRegionName.textContent = "—";
            elements.topRegionRevenue.textContent = "₹ —";
            elements.topRegionOrders.textContent =
                "No regional results available.";

            return;
        }

        const maxRevenue = Math.max(
            ...regions.map(row => Number(row.total_revenue) || 0)
        );

        regions.forEach((row, index) => {

            const amount = Number(row.total_revenue) || 0;

            const percentage = maxRevenue > 0
                ? (amount / maxRevenue) * 100
                : 0;

            const regionRow = createElement(
                "div",
                "region-row"
            );

            const name = createElement(
                "span",
                "region-name",
                row.region
            );

            const track = createElement(
                "div",
                "region-bar-track"
            );

            const fill = createElement(
                "div",
                "region-bar-fill"
            );

            fill.style.width = reducedMotion
                ? `${percentage}%`
                : "0%";

            track.appendChild(fill);

            const amountLabel = createElement(
                "strong",
                "region-value",
                formatCompactCurrency(amount)
            );

            regionRow.append(name, track, amountLabel);

            regionRow.title =
                `${row.region}: ${formatPreciseCurrency(amount)} | ` +
                `${formatNumber(row.total_orders)} orders`;

            elements.regionBars.appendChild(regionRow);

            if (!reducedMotion) {

                requestAnimationFrame(() => {

                    requestAnimationFrame(() => {

                        fill.style.width = `${percentage}%`;
                    });
                });
            }
        });


        // Highlight the highest-revenue region
        const leader = regions[0];

        elements.topRegionName.textContent = leader.region;

        elements.topRegionRevenue.textContent =
            formatCompactCurrency(leader.total_revenue);

        elements.topRegionOrders.textContent =
            `${formatNumber(leader.total_orders)} completed orders · ` +
            `Average order ${formatCurrency(leader.average_order_value)}`;
    }


    // =====================================================
    // 21. PRODUCT TABLE
    // =====================================================

    function createProductRow(product, index) {

        const row = createElement("tr");

        const productCell = createElement("td");

        const productName = createElement(
            "div",
            "product-name-cell"
        );

        const icon = createElement(
            "span",
            "product-table-icon",
            "◈"
        );

        const name = createElement(
            "span",
            "",
            product.product_name
        );

        const position = createElement(
            "span",
            `position-number ${index < 3 ? "top-position" : ""}`,
            index + 1
        );

        productName.append(position, icon, name);

        productCell.appendChild(productName);


        const categoryCell = createElement("td");

        const category = createElement(
            "span",
            "category-chip",
            product.category_name
        );

        categoryCell.appendChild(category);


        const unitsCell = createElement(
            "td",
            "",
            formatNumber(product.units_sold)
        );

        const ordersCell = createElement(
            "td",
            "",
            formatNumber(product.orders_count)
        );

        const priceCell = createElement(
            "td",
            "",
            formatCurrency(product.average_selling_price)
        );

        const revenueCell = createElement(
            "td",
            "revenue-cell",
            formatCurrency(product.total_revenue)
        );

        revenueCell.classList.add("align-right");

        row.append(
            productCell,
            categoryCell,
            unitsCell,
            ordersCell,
            priceCell,
            revenueCell
        );

        return row;
    }


    function renderProductTable(products) {

        elements.productTableBody.replaceChildren();

        productRows = Array.isArray(products)
            ? products
            : [];

        const searchTerm =
            elements.productSearch.value.trim().toLowerCase();

        const filteredProducts = productRows.filter(product => {

            return (
                product.product_name.toLowerCase().includes(searchTerm) ||
                product.category_name.toLowerCase().includes(searchTerm)
            );
        });

        elements.productCount.textContent =
            `${formatNumber(filteredProducts.length)} RESULTS`;


        if (filteredProducts.length === 0) {

            const row = createElement("tr");

            const cell = createElement(
                "td",
                "empty-cell",
                "No matching products found."
            );

            cell.colSpan = 6;

            row.appendChild(cell);

            elements.productTableBody.appendChild(row);

            elements.productTableFooter.textContent =
                "No products match your search.";

            return;
        }


        filteredProducts.forEach((product, index) => {

            const row = createProductRow(product, index);

            elements.productTableBody.appendChild(row);
        });


        elements.productTableFooter.textContent =
            `Showing ${filteredProducts.length} of ${productRows.length} returned products`;
    }


    // =====================================================
    // 22. HIGH-VALUE TRANSACTION TABLE
    // =====================================================

    function renderTransactionTable(orders) {

        elements.orderTableBody.replaceChildren();

        if (!orders || orders.length === 0) {

            const row = createElement("tr");

            const cell = createElement(
                "td",
                "empty-cell",
                "No orders meet the ₹10,000 threshold."
            );

            cell.colSpan = 6;

            row.appendChild(cell);

            elements.orderTableBody.appendChild(row);

            elements.orderCount.textContent = "0 ORDERS";

            return;
        }


        elements.orderCount.textContent =
            `${formatNumber(orders.length)} ORDERS`;


        orders.forEach(order => {

            const row = createElement("tr");

            const orderId = createElement(
                "td",
                "",
                `#${String(order.order_id).padStart(5, "0")}`
            );

            const orderDate = createElement(
                "td",
                "",
                formatDate(order.order_date)
            );

            const customer = createElement(
                "td",
                "",
                order.customer_name
            );

            const region = createElement(
                "td",
                "",
                order.region
            );

            const units = createElement(
                "td",
                "",
                formatNumber(order.total_units)
            );

            const revenue = createElement(
                "td",
                "revenue-cell",
                formatCurrency(order.order_revenue)
            );

            revenue.classList.add("align-right");

            row.append(
                orderId,
                orderDate,
                customer,
                region,
                units,
                revenue
            );

            elements.orderTableBody.appendChild(row);
        });
    }


    // =====================================================
    // 23. BUSINESS INSIGHTS
    // =====================================================

    function renderBusinessInsights(data) {

        const categories = data.category_sales || [];
        const regions = data.regional_sales || [];
        const months = data.monthly_sales || [];
        const products = data.top_products || [];

        if (categories.length === 0) {

            elements.insightTitle.textContent =
                "Explore a different revenue threshold.";

            elements.insightDescription.textContent =
                "No category currently meets the selected minimum revenue. " +
                "Reduce the threshold to explore more categories.";

            return;
        }


        const topCategory = categories[0];
        const topRegion = regions[0];
        const topProduct = products[0];

        elements.insightTitle.textContent =
            `${topCategory.category_name} leads category revenue.`;


        let description =
            `${topCategory.category_name} generated ` +
            `${formatPreciseCurrency(topCategory.total_revenue)} ` +
            `in the selected period.`;


        if (topRegion) {

            description +=
                ` ${topRegion.region} is the leading region, with ` +
                `${formatPreciseCurrency(topRegion.total_revenue)} in revenue.`;
        }


        if (topProduct) {

            description +=
                ` ${topProduct.product_name} is your top product by revenue.`;
        }


        if (months.length > 0) {

            const peakMonth = months.reduce(
                (best, current) =>
                    Number(current.monthly_revenue) >
                    Number(best.monthly_revenue)
                        ? current
                        : best
            );

            description +=
                ` Your strongest month was ${formatMonth(peakMonth.sales_month)}.`;
        }

        elements.insightDescription.textContent = description;
    }


    // =====================================================
    // 24. RENDER COMPLETE DASHBOARD
    // =====================================================

    function renderDashboard(data) {

        dashboardData = data;

        // KPI cards
        renderKpis(data.summary);

        // Main analytics charts
        renderRevenueChart(data.monthly_sales);

        renderCategoryChart(data.category_sales);

        renderRegionalChart(data.regional_sales);

        // Data tables
        renderProductTable(data.top_products);

        renderTransactionTable(data.high_value_orders);

        // Business summary
        renderBusinessInsights(data);

        // Filter status
        updateFilterFeedback(data.filters);
    }


    // =====================================================
    // 25. FILTER FEEDBACK
    // =====================================================

    function updateFilterFeedback(filters) {

        if (!elements.filterFeedback) return;

        const isDefault =
            filters.region === "All" &&
            filters.category === "All" &&
            Number(filters.min_revenue) === 1000000 &&
            filters.start_date === filterOptions.minimum_date &&
            filters.end_date === filterOptions.maximum_date;

        if (isDefault) {

            elements.filterFeedback.textContent =
                "Showing all available sales";

            return;
        }

        const activeFilters = [];

        if (filters.region !== "All") {
            activeFilters.push(filters.region);
        }

        if (filters.category !== "All") {
            activeFilters.push(filters.category);
        }

        if (Number(filters.min_revenue) > 0) {
            activeFilters.push(
                `Min. ${formatCurrency(filters.min_revenue)}`
            );
        }

        activeFilters.push(
            `${filters.start_date} to ${filters.end_date}`
        );

        elements.filterFeedback.textContent =
            `Filtered results · ${activeFilters.join(" · ")}`;
    }


    // =====================================================
    // 26. LOAD AND UPDATE DASHBOARD
    // =====================================================

    async function loadDashboard({ initial = false } = {}) {

        if (isLoading) return;

        isLoading = true;

        const requestNumber = ++currentRequestNumber;

        setUpdatingState(true);

        try {

            const filters = getCurrentFilters();

            validateFilters(filters);

            const url = buildDashboardUrl(filters);

            const result = await apiRequest(url);

            // Ignore an outdated response if another request replaced it.
            if (requestNumber !== currentRequestNumber) {
                return;
            }

            renderDashboard(result);

            if (!initial) {

                showToast(
                    "Dashboard updated using fresh SQL results.",
                    "success"
                );
            }

        } catch (error) {

            console.error("Dashboard update failed:", error);

            if (requestNumber === currentRequestNumber) {

                showToast(
                    error.message || "Unable to load dashboard data.",
                    "error"
                );
            }

        } finally {

            if (requestNumber === currentRequestNumber) {

                isLoading = false;

                setUpdatingState(false);

                if (initial) {
                    hideInitialLoader();
                }
            }
        }
    }


    // =====================================================
    // 27. APPLY FILTER BUTTON
    // =====================================================

    elements.applyFilters.addEventListener("click", () => {

        loadDashboard();
    });


    // =====================================================
    // 28. RESET FILTERS
    // =====================================================

    elements.resetFilters.addEventListener("click", () => {

        if (!filterOptions) return;

        elements.startDate.value =
            filterOptions.minimum_date;

        elements.endDate.value =
            filterOptions.maximum_date;

        elements.region.value = "All";
        elements.category.value = "All";
        elements.minRevenue.value = "1000000";

        elements.productSearch.value = "";

        loadDashboard();
    });


    // =====================================================
    // 29. PRODUCT SEARCH
    // =====================================================

    elements.productSearch.addEventListener("input", () => {

        renderProductTable(productRows);
    });


    // =====================================================
    // 30. DATE INPUT VALIDATION
    // =====================================================

    elements.startDate.addEventListener("change", () => {

        elements.endDate.min = elements.startDate.value;

        if (
            elements.endDate.value &&
            elements.endDate.value < elements.startDate.value
        ) {
            elements.endDate.value =
                elements.startDate.value;
        }
    });


    elements.endDate.addEventListener("change", () => {

        elements.startDate.max = elements.endDate.value;

        if (
            elements.startDate.value &&
            elements.startDate.value > elements.endDate.value
        ) {
            elements.startDate.value =
                elements.endDate.value;
        }
    });


    // =====================================================
    // 31. REFRESH BUTTON
    // =====================================================

    elements.refresh.addEventListener("click", () => {

        if (isLoading) return;

        if (!reducedMotion) {

            elements.refresh.animate(
                [
                    { transform: "rotate(0deg)" },
                    { transform: "rotate(360deg)" }
                ],
                {
                    duration: 450,
                    easing: "ease-in-out"
                }
            );
        }

        loadDashboard();
    });


    // =====================================================
    // 32. MOBILE NAVIGATION
    // =====================================================

    function closeMobileMenu() {

        elements.sidebar.classList.remove("mobile-open");

        elements.menuButton.setAttribute(
            "aria-expanded",
            "false"
        );
    }


    elements.menuButton.addEventListener("click", () => {

        const isOpen =
            elements.sidebar.classList.toggle("mobile-open");

        elements.menuButton.setAttribute(
            "aria-expanded",
            String(isOpen)
        );
    });


    document.querySelectorAll(".nav-item").forEach(link => {

        link.addEventListener("click", () => {

            document.querySelectorAll(".nav-item").forEach(item => {

                item.classList.remove("active");

                item.removeAttribute("aria-current");
            });

            link.classList.add("active");

            link.setAttribute("aria-current", "location");

            closeMobileMenu();
        });
    });


    // Close the mobile sidebar after clicking elsewhere.
    elements.main.addEventListener("click", (event) => {

    if (!elements.menuButton.contains(event.target)) {
        closeMobileMenu();
    }

});


    // =====================================================
    // 33. INITIALIZE APPLICATION
    // =====================================================

    async function initialize() {

        updateCurrentDate();

        try {

            // Load real database filter options.
            await loadFilterOptions();

            // Load actual SQL results.
            await loadDashboard({
                initial: true
            });

        } catch (error) {

            console.error(
                "PIVOT initialization failed:",
                error
            );

            hideInitialLoader();

            showToast(
                error.message ||
                "Unable to connect to the sales database.",
                "error"
            );

        }
    }


    initialize();

});
