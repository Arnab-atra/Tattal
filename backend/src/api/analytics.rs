use axum::{Json, extract::State, http::StatusCode};
use chrono::{Datelike, Utc};
use serde::Serialize;

use crate::api::dashboard::AppState;

#[derive(Debug, Serialize)]
pub struct AnalyticsResponse {
    pub period: AnalyticsPeriod,
    pub sales_metrics: SalesMetrics,
    pub margins: ProfitMargins,
    pub daily_trend: Vec<DailyTrend>,
    pub monthly_trend: Vec<MonthlyTrend>,
    pub top_products: Vec<TopProduct>,
    pub inventory: InventoryMetrics,
}

#[derive(Debug, Serialize)]
pub struct AnalyticsPeriod {
    pub year: i32,
    pub month: u32,
}

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

#[derive(Debug, Serialize)]
pub struct ProfitMargins {
    pub gross_margin: Option<f64>,
    pub net_margin: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct DailyTrend {
    pub date: String,
    pub revenue: i64,
    pub cogs: i64,
    pub gross_profit: i64,
    pub expenses: i64,
    pub net_profit: i64,
}

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

#[derive(Debug, Serialize)]
pub struct TopProduct {
    pub product_id: String,
    pub product_name: String,
    pub units_sold: i64,
    pub revenue: i64,
    pub cogs: i64,
    pub gross_profit: i64,
}

#[derive(Debug, Serialize)]
pub struct InventoryMetrics {
    pub products: i64,
    pub units_in_stock: i64,
    pub stock_cost_value: i64,
    pub potential_sales_value: i64,
    pub potential_gross_profit: i64,
}

fn calculate_margin(value: i64, revenue: i64) -> Option<f64> {
    if revenue == 0 {
        None
    } else {
        Some((value as f64 / revenue as f64) * 100.0)
    }
}

pub async fn analytics(
    State(state): State<AppState>,
) -> Result<Json<AnalyticsResponse>, (StatusCode, String)> {
    let now = Utc::now();
    let year = now.year();
    let month = now.month();

    // --------------------------------------------------
    // SALES METRICS
    // --------------------------------------------------

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

    // --------------------------------------------------
    // PROFIT MARGINS
    // --------------------------------------------------

    let margins = ProfitMargins {
        gross_margin: calculate_margin(gross_profit, revenue),
        net_margin: calculate_margin(net_profit, revenue),
    };

    // --------------------------------------------------
    // DAILY TREND
    //
    // Build three independent datasets:
    //   1. sales by day
    //   2. COGS by day
    //   3. expenses by day
    //
    // Then combine them in Rust.
    //
    // This prevents:
    //   - sales rows multiplying because of sale_items
    //   - expenses disappearing on expense-only days
    // --------------------------------------------------

    let daily_sales = sqlx::query_as::<_, (String, i64)>(
        r#"
        SELECT
            date(sale_date) AS day,
            COALESCE(SUM(total), 0) AS revenue
        FROM sales
        GROUP BY date(sale_date)
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(internal_error)?;

    let daily_cogs = sqlx::query_as::<_, (String, i64)>(
        r#"
        SELECT
            date(s.sale_date) AS day,
            COALESCE(
                SUM(si.quantity * si.cost_price),
                0
            ) AS cogs
        FROM sales s
        JOIN sale_items si
            ON si.sale_id = s.id
        GROUP BY date(s.sale_date)
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(internal_error)?;

    let daily_expenses = sqlx::query_as::<_, (String, i64)>(
        r#"
        SELECT
            date(expense_date) AS day,
            COALESCE(SUM(amount), 0) AS expenses
        FROM expenses
        GROUP BY date(expense_date)
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(internal_error)?;

    use std::collections::BTreeSet;

    let mut daily_dates = BTreeSet::new();

    for (date, _) in &daily_sales {
        daily_dates.insert(date.clone());
    }

    for (date, _) in &daily_cogs {
        daily_dates.insert(date.clone());
    }

    for (date, _) in &daily_expenses {
        daily_dates.insert(date.clone());
    }

    let sales_by_day: std::collections::HashMap<_, _> = daily_sales.into_iter().collect();

    let cogs_by_day: std::collections::HashMap<_, _> = daily_cogs.into_iter().collect();

    let expenses_by_day: std::collections::HashMap<_, _> = daily_expenses.into_iter().collect();

    let mut daily_trend = Vec::new();

    for date in daily_dates.into_iter().rev().take(30) {
        let revenue = *sales_by_day.get(&date).unwrap_or(&0);
        let cogs = *cogs_by_day.get(&date).unwrap_or(&0);
        let expenses = *expenses_by_day.get(&date).unwrap_or(&0);

        let gross_profit = revenue - cogs;
        let net_profit = gross_profit - expenses;

        daily_trend.push(DailyTrend {
            date,
            revenue,
            cogs,
            gross_profit,
            expenses,
            net_profit,
        });
    }

    // --------------------------------------------------
    // MONTHLY TREND
    //
    // Same principle as daily trend:
    // sales, COGS and expenses are aggregated independently.
    //
    // This ensures months containing only expenses still appear.
    // --------------------------------------------------

    let monthly_sales = sqlx::query_as::<_, (String, i64)>(
        r#"
        SELECT
            strftime('%Y-%m', sale_date) AS month,
            COALESCE(SUM(total), 0) AS revenue
        FROM sales
        GROUP BY strftime('%Y-%m', sale_date)
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(internal_error)?;

    let monthly_cogs = sqlx::query_as::<_, (String, i64)>(
        r#"
        SELECT
            strftime('%Y-%m', s.sale_date) AS month,
            COALESCE(
                SUM(si.quantity * si.cost_price),
                0
            ) AS cogs
        FROM sales s
        JOIN sale_items si
            ON si.sale_id = s.id
        GROUP BY strftime('%Y-%m', s.sale_date)
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(internal_error)?;

    let monthly_expenses = sqlx::query_as::<_, (String, i64)>(
        r#"
        SELECT
            strftime('%Y-%m', expense_date) AS month,
            COALESCE(SUM(amount), 0) AS expenses
        FROM expenses
        GROUP BY strftime('%Y-%m', expense_date)
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(internal_error)?;

    let mut monthly_keys = BTreeSet::new();

    for (month_string, _) in &monthly_sales {
        monthly_keys.insert(month_string.clone());
    }

    for (month_string, _) in &monthly_cogs {
        monthly_keys.insert(month_string.clone());
    }

    for (month_string, _) in &monthly_expenses {
        monthly_keys.insert(month_string.clone());
    }

    let sales_by_month: std::collections::HashMap<_, _> = monthly_sales.into_iter().collect();

    let cogs_by_month: std::collections::HashMap<_, _> = monthly_cogs.into_iter().collect();

    let expenses_by_month: std::collections::HashMap<_, _> = monthly_expenses.into_iter().collect();

    let mut monthly_trend = Vec::new();

    for month_string in monthly_keys.into_iter().rev().take(12) {
        if month_string.len() != 7 {
            return Err(internal_message("Invalid month in monthly analytics"));
        }

        let parsed_year = month_string[0..4]
            .parse::<i32>()
            .map_err(|_| internal_message("Invalid year in monthly analytics"))?;

        let parsed_month = month_string[5..7]
            .parse::<u32>()
            .map_err(|_| internal_message("Invalid month in monthly analytics"))?;

        let revenue = *sales_by_month.get(&month_string).unwrap_or(&0);
        let cogs = *cogs_by_month.get(&month_string).unwrap_or(&0);
        let expenses = *expenses_by_month.get(&month_string).unwrap_or(&0);

        let gross_profit = revenue - cogs;
        let net_profit = gross_profit - expenses;

        monthly_trend.push(MonthlyTrend {
            year: parsed_year,
            month: parsed_month,
            revenue,
            cogs,
            gross_profit,
            expenses,
            net_profit,
        });
    }

    // --------------------------------------------------
    // TOP PRODUCTS
    // --------------------------------------------------

    let product_rows = sqlx::query_as::<_, (String, String, i64, i64, i64)>(
        r#"
        SELECT
            p.id,
            p.name,

            COALESCE(SUM(si.quantity), 0) AS units_sold,

            COALESCE(SUM(si.total), 0) AS revenue,

            COALESCE(
                SUM(si.quantity * si.cost_price),
                0
            ) AS cogs

        FROM sale_items si

        JOIN products p
            ON p.id = si.product_id

        GROUP BY p.id, p.name

        ORDER BY revenue DESC

        LIMIT 10
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(internal_error)?;

    let top_products = product_rows
        .into_iter()
        .map(
            |(product_id, product_name, units_sold, revenue, cogs)| TopProduct {
                product_id,
                product_name,
                units_sold,
                revenue,
                cogs,
                gross_profit: revenue - cogs,
            },
        )
        .collect();

    // --------------------------------------------------
    // INVENTORY
    // --------------------------------------------------

    let inventory_row = sqlx::query_as::<_, (i64, i64, i64, i64)>(
        r#"
        SELECT
            COUNT(*),

            COALESCE(
                SUM(stock_quantity),
                0
            ),

            COALESCE(
                SUM(stock_quantity * cost_price),
                0
            ),

            COALESCE(
                SUM(stock_quantity * selling_price),
                0
            )

        FROM products
        "#,
    )
    .fetch_one(&state.pool)
    .await
    .map_err(internal_error)?;

    let (products, units_in_stock, stock_cost_value, potential_sales_value) = inventory_row;

    let potential_gross_profit = potential_sales_value - stock_cost_value;

    let inventory = InventoryMetrics {
        products,
        units_in_stock,
        stock_cost_value,
        potential_sales_value,
        potential_gross_profit,
    };

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

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

// --------------------------------------------------
// ERROR HELPERS
// --------------------------------------------------

fn internal_error(error: sqlx::Error) -> (StatusCode, String) {
    (StatusCode::INTERNAL_SERVER_ERROR, error.to_string())
}

fn internal_message(message: &str) -> (StatusCode, String) {
    (StatusCode::INTERNAL_SERVER_ERROR, message.to_string())
}
