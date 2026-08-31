// ============================================================
// ANALYTICS ENDPOINT
//
// Provides detailed business analytics for the dashboard.
//
// The endpoint provides:
// - All-time sales metrics
// - Profit and margin calculations
// - Last 30 calendar days of daily trends
// - Last 12 calendar months of monthly trends
// - Top-selling products
// - Current inventory valuation
//
// PLATFORM SUPPORT
// ------------------------------------------------------------
// The analytics layer is platform-independent.
//
// The backend uses SQLite and standard SQL date functions.
// Business dates are based on the local system date rather
// than UTC so that the application behaves naturally for
// desktop users on Windows and Linux.
// ============================================================

use axum::{Json, extract::State, http::StatusCode};
use chrono::{Datelike, Local};
use serde::Serialize;
use sqlx::FromRow;
use tracing::error;

use crate::api::dashboard::AppState;

// ============================================================
// RESPONSE TYPES
// ============================================================

/// Complete analytics response returned by `GET /api/analytics`.
#[derive(Debug, Serialize)]
pub struct AnalyticsResponse {
    /// Current reporting period.
    pub period: AnalyticsPeriod,

    /// All-time sales and financial metrics.
    pub sales_metrics: SalesMetrics,

    /// Gross and net profit margins.
    pub margins: ProfitMargins,

    /// Daily financial trend for the last 30 calendar days.
    pub daily_trend: Vec<DailyTrend>,

    /// Monthly financial trend for the last 12 calendar months.
    pub monthly_trend: Vec<MonthlyTrend>,

    /// Top products ranked by revenue.
    pub top_products: Vec<TopProduct>,

    /// Current inventory valuation.
    pub inventory: InventoryMetrics,
}

/// Identifies the current reporting period.
#[derive(Debug, Serialize)]
pub struct AnalyticsPeriod {
    pub year: i32,
    pub month: u32,
}

/// All-time sales and financial metrics.
///
/// These values represent the complete history stored in the
/// database, not only the current month.
#[derive(Debug, Serialize)]
pub struct SalesMetrics {
    pub total_sales: i64,
    pub total_units_sold: i64,
    pub revenue: i64,
    pub cogs: i64,
    pub gross_profit: i64,
    pub expenses: i64,
    pub net_profit: i64,
    pub average_sale_value: i64,
}

/// Profit margin percentages.
///
/// `None` is returned when revenue is zero because a margin
/// cannot be meaningfully calculated.
#[derive(Debug, Serialize)]
pub struct ProfitMargins {
    pub gross_margin: Option<f64>,
    pub net_margin: Option<f64>,
}

/// Financial information for one calendar day.
#[derive(Debug, Serialize)]
pub struct DailyTrend {
    pub date: String,
    pub revenue: i64,
    pub cogs: i64,
    pub gross_profit: i64,
    pub expenses: i64,
    pub net_profit: i64,
}

/// Financial information for one calendar month.
#[derive(Debug, Serialize)]
pub struct MonthlyTrend {
    pub year: i32,
    pub month: u32,
    pub revenue: i64,
    pub cogs: i64,
    pub gross_profit: i64,
    pub expenses: i64,
    pub net_profit: i64,
}

/// Aggregated information for one product.
#[derive(Debug, Serialize)]
pub struct TopProduct {
    pub product_id: String,
    pub product_name: String,
    pub units_sold: i64,
    pub revenue: i64,
    pub cogs: i64,
    pub gross_profit: i64,
}

/// Current inventory statistics and valuation.
#[derive(Debug, Serialize)]
pub struct InventoryMetrics {
    pub products: i64,
    pub units_in_stock: i64,
    pub stock_cost_value: i64,
    pub potential_sales_value: i64,
    pub potential_gross_profit: i64,
}

// ============================================================
// DATABASE QUERY TYPES
// ============================================================

/// Result of the daily aggregation query.
#[derive(Debug, FromRow)]
struct DailyAggregate {
    date: String,
    revenue: i64,
    cogs: i64,
    expenses: i64,
}

/// Result of the monthly aggregation query.
#[derive(Debug, FromRow)]
struct MonthlyAggregate {
    year: i32,
    month: u32,
    revenue: i64,
    cogs: i64,
    expenses: i64,
}

/// Result of the top-products query.
#[derive(Debug, FromRow)]
struct TopProductRow {
    product_id: String,
    product_name: String,
    units_sold: i64,
    revenue: i64,
    cogs: i64,
}

/// Result of the inventory summary query.
#[derive(Debug, FromRow)]
struct InventoryRow {
    products: i64,
    units_in_stock: i64,
    stock_cost_value: i64,
    potential_sales_value: i64,
}

// ============================================================
// HELPERS
// ============================================================

/// Calculates a percentage margin.
///
/// Returns `None` when revenue is zero.
fn calculate_margin(value: i64, revenue: i64) -> Option<f64> {
    if revenue == 0 {
        None
    } else {
        Some((value as f64 / revenue as f64) * 100.0)
    }
}

/// Converts a SQLx database error into a safe HTTP error.
///
/// The real database error is logged for developers/operators,
/// while clients receive a generic message.
fn internal_error(error: sqlx::Error) -> (StatusCode, String) {
    error!("Database error in analytics: {error:?}");

    (
        StatusCode::INTERNAL_SERVER_ERROR,
        "Internal server error".to_string(),
    )
}

// ============================================================
// ENDPOINT HANDLER
// ============================================================

/// Handles `GET /api/analytics`.
///
/// The response contains:
///
/// - All-time sales metrics
/// - Profit margins
/// - Last 30 calendar days
/// - Last 12 calendar months
/// - Top 10 products
/// - Current inventory valuation
///
/// Business reporting uses the local system date. This is
/// important for a desktop application because users expect
/// "today" and "this month" to follow their local calendar.
pub async fn analytics(
    State(state): State<AppState>,
) -> Result<Json<AnalyticsResponse>, (StatusCode, String)> {
    // --------------------------------------------------------
    // CURRENT REPORTING PERIOD
    // --------------------------------------------------------

    let today = Local::now().date_naive();

    let year = today.year();
    let month = today.month();

    // --------------------------------------------------------
    // ALL-TIME SALES METRICS
    // --------------------------------------------------------
    //
    // IMPORTANT:
    //
    // Sales and sale_items are intentionally aggregated
    // separately.
    //
    // Joining sales directly to sale_items and then doing:
    //
    //     SUM(sales.total)
    //
    // can multiply the sale total when a sale contains
    // multiple line items.
    //
    // Therefore:
    // - sales count/revenue come from `sales`
    // - units/COGS come from `sale_items`
    // - expenses come from `expenses`
    // --------------------------------------------------------

    let total_sales: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM sales
        "#,
    )
    .fetch_one(&state.pool)
    .await
    .map_err(internal_error)?;

    let total_units_sold: i64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(quantity), 0)
        FROM sale_items
        "#,
    )
    .fetch_one(&state.pool)
    .await
    .map_err(internal_error)?;

    let revenue: i64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(total), 0)
        FROM sales
        "#,
    )
    .fetch_one(&state.pool)
    .await
    .map_err(internal_error)?;

    let cogs: i64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(quantity * cost_price), 0)
        FROM sale_items
        "#,
    )
    .fetch_one(&state.pool)
    .await
    .map_err(internal_error)?;

    let expenses: i64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(amount), 0)
        FROM expenses
        "#,
    )
    .fetch_one(&state.pool)
    .await
    .map_err(internal_error)?;

    let gross_profit = revenue - cogs;
    let net_profit = gross_profit - expenses;

    let average_sale_value = if total_sales == 0 {
        0
    } else {
        revenue / total_sales
    };

    let sales_metrics = SalesMetrics {
        total_sales,
        total_units_sold,
        revenue,
        cogs,
        gross_profit,
        expenses,
        net_profit,
        average_sale_value,
    };

    // --------------------------------------------------------
    // PROFIT MARGINS
    // --------------------------------------------------------

    let margins = ProfitMargins {
        gross_margin: calculate_margin(gross_profit, revenue),
        net_margin: calculate_margin(net_profit, revenue),
    };

    // --------------------------------------------------------
    // DAILY TREND
    // --------------------------------------------------------
    //
    // Generate exactly the last 30 calendar days.
    //
    // This is different from simply querying:
    //
    //     ORDER BY date DESC LIMIT 30
    //
    // because that would skip days with no transactions.
    //
    // The recursive CTE generates:
    //
    // today - 29 days
    // ...
    // today
    //
    // and then sales/expenses are joined onto those dates.
    // --------------------------------------------------------

    let today_string = today.format("%Y-%m-%d").to_string();

    let daily_aggregates: Vec<DailyAggregate> = sqlx::query_as(
        r#"
        WITH RECURSIVE days(day) AS (
            SELECT date(?, '-29 days')

            UNION ALL

            SELECT date(day, '+1 day')
            FROM days
            WHERE day < date(?)
        ),

        sales_daily AS (
            SELECT
                date(s.sale_date) AS day,
                COALESCE(SUM(s.total), 0) AS revenue,
                COALESCE((
                    SELECT SUM(si.quantity * si.cost_price)
                    FROM sale_items si
                    WHERE si.sale_id = s.id
                ), 0) AS cogs
            FROM sales s
            WHERE date(s.sale_date)
                BETWEEN date(?, '-29 days') AND date(?)
            GROUP BY date(s.sale_date), s.id
        ),

        sales_totals AS (
            SELECT
                day,
                SUM(revenue) AS revenue,
                SUM(cogs) AS cogs
            FROM sales_daily
            GROUP BY day
        ),

        expenses_daily AS (
            SELECT
                date(expense_date) AS day,
                COALESCE(SUM(amount), 0) AS expenses
            FROM expenses
            WHERE date(expense_date)
                BETWEEN date(?, '-29 days') AND date(?)
            GROUP BY date(expense_date)
        )

        SELECT
            days.day AS date,
            COALESCE(sales_totals.revenue, 0) AS revenue,
            COALESCE(sales_totals.cogs, 0) AS cogs,
            COALESCE(expenses_daily.expenses, 0) AS expenses

        FROM days

        LEFT JOIN sales_totals
            ON sales_totals.day = days.day

        LEFT JOIN expenses_daily
            ON expenses_daily.day = days.day

        ORDER BY days.day ASC
        "#,
    )
    .bind(&today_string)
    .bind(&today_string)
    .bind(&today_string)
    .bind(&today_string)
    .bind(&today_string)
    .bind(&today_string)
    .fetch_all(&state.pool)
    .await
    .map_err(internal_error)?;

    let daily_trend = daily_aggregates
        .into_iter()
        .map(|row| {
            let gross_profit = row.revenue - row.cogs;
            let net_profit = gross_profit - row.expenses;

            DailyTrend {
                date: row.date,
                revenue: row.revenue,
                cogs: row.cogs,
                gross_profit,
                expenses: row.expenses,
                net_profit,
            }
        })
        .collect();

    // --------------------------------------------------------
    // MONTHLY TREND
    // --------------------------------------------------------
    //
    // Generate exactly the last 12 calendar months.
    //
    // Zero-activity months are retained so the frontend can
    // render a continuous financial chart.
    // --------------------------------------------------------

    let monthly_aggregates: Vec<MonthlyAggregate> = sqlx::query_as(
        r#"
        WITH RECURSIVE months(month_start, month_number) AS (
            SELECT
                date(?, 'start of month', '-11 months'),
                1

            UNION ALL

            SELECT
                date(month_start, '+1 month'),
                month_number + 1
            FROM months
            WHERE month_number < 12
        ),

        sales_monthly AS (
            SELECT
                strftime('%Y-%m', s.sale_date) AS month,
                COALESCE(SUM(s.total), 0) AS revenue,
                COALESCE((
                    SELECT SUM(si.quantity * si.cost_price)
                    FROM sale_items si
                    WHERE si.sale_id = s.id
                ), 0) AS cogs
            FROM sales s
            WHERE date(s.sale_date) >= date(?, 'start of month', '-11 months')
              AND date(s.sale_date) < date(?, 'start of month', '+1 month')
            GROUP BY strftime('%Y-%m', s.sale_date), s.id
        ),

        sales_totals AS (
            SELECT
                month,
                SUM(revenue) AS revenue,
                SUM(cogs) AS cogs
            FROM sales_monthly
            GROUP BY month
        ),

        expenses_monthly AS (
            SELECT
                strftime('%Y-%m', expense_date) AS month,
                COALESCE(SUM(amount), 0) AS expenses
            FROM expenses
            WHERE date(expense_date) >= date(?, 'start of month', '-11 months')
              AND date(expense_date) < date(?, 'start of month', '+1 month')
            GROUP BY strftime('%Y-%m', expense_date)
        )

        SELECT
            CAST(strftime('%Y', months.month_start) AS INTEGER) AS year,
            CAST(strftime('%m', months.month_start) AS INTEGER) AS month,
            COALESCE(sales_totals.revenue, 0) AS revenue,
            COALESCE(sales_totals.cogs, 0) AS cogs,
            COALESCE(expenses_monthly.expenses, 0) AS expenses

        FROM months

        LEFT JOIN sales_totals
            ON sales_totals.month = strftime('%Y-%m', months.month_start)

        LEFT JOIN expenses_monthly
            ON expenses_monthly.month = strftime('%Y-%m', months.month_start)

        ORDER BY months.month_start ASC
        "#,
    )
    .bind(&today_string)
    .bind(&today_string)
    .bind(&today_string)
    .bind(&today_string)
    .bind(&today_string)
    .fetch_all(&state.pool)
    .await
    .map_err(internal_error)?;

    let monthly_trend = monthly_aggregates
        .into_iter()
        .map(|row| {
            let gross_profit = row.revenue - row.cogs;
            let net_profit = gross_profit - row.expenses;

            MonthlyTrend {
                year: row.year,
                month: row.month,
                revenue: row.revenue,
                cogs: row.cogs,
                gross_profit,
                expenses: row.expenses,
                net_profit,
            }
        })
        .collect();

    // --------------------------------------------------------
    // TOP PRODUCTS
    // --------------------------------------------------------
    //
    // Products are ranked by revenue.
    //
    // Revenue and COGS are calculated from sale_items so each
    // product is represented independently.
    // --------------------------------------------------------

    let top_product_rows: Vec<TopProductRow> = sqlx::query_as(
        r#"
        SELECT
            p.id AS product_id,
            p.name AS product_name,

            COALESCE(SUM(si.quantity), 0) AS units_sold,

            COALESCE(SUM(si.total), 0) AS revenue,

            COALESCE(
                SUM(si.quantity * si.cost_price),
                0
            ) AS cogs

        FROM sale_items si

        INNER JOIN products p
            ON p.id = si.product_id

        GROUP BY
            p.id,
            p.name

        ORDER BY revenue DESC

        LIMIT 10
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(internal_error)?;

    let top_products = top_product_rows
        .into_iter()
        .map(|row| TopProduct {
            product_id: row.product_id,
            product_name: row.product_name,
            units_sold: row.units_sold,
            revenue: row.revenue,
            cogs: row.cogs,
            gross_profit: row.revenue - row.cogs,
        })
        .collect();

    // --------------------------------------------------------
    // INVENTORY
    // --------------------------------------------------------

    let inventory_row: InventoryRow = sqlx::query_as(
        r#"
        SELECT
            COUNT(*) AS products,

            COALESCE(
                SUM(stock_quantity),
                0
            ) AS units_in_stock,

            COALESCE(
                SUM(stock_quantity * cost_price),
                0
            ) AS stock_cost_value,

            COALESCE(
                SUM(stock_quantity * selling_price),
                0
            ) AS potential_sales_value

        FROM products
        "#,
    )
    .fetch_one(&state.pool)
    .await
    .map_err(internal_error)?;

    let inventory = InventoryMetrics {
        products: inventory_row.products,
        units_in_stock: inventory_row.units_in_stock,
        stock_cost_value: inventory_row.stock_cost_value,
        potential_sales_value: inventory_row.potential_sales_value,
        potential_gross_profit: inventory_row.potential_sales_value
            - inventory_row.stock_cost_value,
    };

    // --------------------------------------------------------
    // FINAL RESPONSE
    // --------------------------------------------------------

    Ok(Json(AnalyticsResponse {
        period: AnalyticsPeriod { year, month },
        sales_metrics,
        margins,
        daily_trend,
        monthly_trend,
        top_products,
        inventory,
    }))
}
