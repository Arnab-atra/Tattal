use sqlx::SqlitePool;

#[derive(Debug)]
pub struct FinancialSummary {
    pub revenue: i64,
    pub cogs: i64,
    pub gross_profit: i64,
    pub expenses: i64,
    pub net_profit: i64,
}

impl FinancialSummary {
    pub fn new(revenue: i64, cogs: i64, expenses: i64) -> Self {
        let gross_profit = revenue - cogs;
        let net_profit = gross_profit - expenses;

        Self {
            revenue,
            cogs,
            gross_profit,
            expenses,
            net_profit,
        }
    }
}

// --------------------------------------------------
// COGS
// --------------------------------------------------
//
// COGS = quantity sold × product cost price
//
// The selling price is NOT used here.
// Revenue comes from sales.total.
// --------------------------------------------------

async fn calculate_cogs(
    pool: &SqlitePool,
    date_filter: Option<&str>,
    year_month: Option<&str>,
    year: Option<i32>,
) -> Result<i64, sqlx::Error> {
    match (date_filter, year_month, year) {
        // Daily
        (Some(date), None, None) => {
            sqlx::query_scalar(
                r#"
                SELECT COALESCE(
                    SUM(si.quantity * p.cost_price),
                    0
                )
                FROM sale_items si
                JOIN sales s
                    ON s.id = si.sale_id
                JOIN products p
                    ON p.id = si.product_id
                WHERE date(s.sale_date) = ?
                "#,
            )
            .bind(date)
            .fetch_one(pool)
            .await
        }

        // Monthly
        (None, Some(month), None) => {
            sqlx::query_scalar(
                r#"
                SELECT COALESCE(
                    SUM(si.quantity * p.cost_price),
                    0
                )
                FROM sale_items si
                JOIN sales s
                    ON s.id = si.sale_id
                JOIN products p
                    ON p.id = si.product_id
                WHERE strftime('%Y-%m', s.sale_date) = ?
                "#,
            )
            .bind(month)
            .fetch_one(pool)
            .await
        }

        // Yearly
        (None, None, Some(year)) => {
            let year_string = year.to_string();

            sqlx::query_scalar(
                r#"
                SELECT COALESCE(
                    SUM(si.quantity * p.cost_price),
                    0
                )
                FROM sale_items si
                JOIN sales s
                    ON s.id = si.sale_id
                JOIN products p
                    ON p.id = si.product_id
                WHERE strftime('%Y', s.sale_date) = ?
                "#,
            )
            .bind(year_string)
            .fetch_one(pool)
            .await
        }

        _ => unreachable!("Invalid COGS filter"),
    }
}

// --------------------------------------------------
// DAILY SUMMARY
// --------------------------------------------------

pub async fn daily_summary(pool: &SqlitePool, date: &str) -> Result<FinancialSummary, sqlx::Error> {
    let revenue: i64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(total), 0)
        FROM sales
        WHERE date(sale_date) = ?
        "#,
    )
    .bind(date)
    .fetch_one(pool)
    .await?;

    let cogs = calculate_cogs(pool, Some(date), None, None).await?;

    let expenses: i64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(amount), 0)
        FROM expenses
        WHERE date(expense_date) = ?
        "#,
    )
    .bind(date)
    .fetch_one(pool)
    .await?;

    Ok(FinancialSummary::new(revenue, cogs, expenses))
}

// --------------------------------------------------
// MONTHLY SUMMARY
// --------------------------------------------------

pub async fn monthly_summary(
    pool: &SqlitePool,
    year: i32,
    month: u32,
) -> Result<FinancialSummary, sqlx::Error> {
    let month_string = format!("{year:04}-{month:02}");

    let revenue: i64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(total), 0)
        FROM sales
        WHERE strftime('%Y-%m', sale_date) = ?
        "#,
    )
    .bind(&month_string)
    .fetch_one(pool)
    .await?;

    let cogs = calculate_cogs(pool, None, Some(&month_string), None).await?;

    let expenses: i64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(amount), 0)
        FROM expenses
        WHERE strftime('%Y-%m', expense_date) = ?
        "#,
    )
    .bind(&month_string)
    .fetch_one(pool)
    .await?;

    Ok(FinancialSummary::new(revenue, cogs, expenses))
}

// --------------------------------------------------
// YEARLY SUMMARY
// --------------------------------------------------

pub async fn yearly_summary(pool: &SqlitePool, year: i32) -> Result<FinancialSummary, sqlx::Error> {
    let year_string = year.to_string();

    let revenue: i64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(total), 0)
        FROM sales
        WHERE strftime('%Y', sale_date) = ?
        "#,
    )
    .bind(&year_string)
    .fetch_one(pool)
    .await?;

    let cogs = calculate_cogs(pool, None, None, Some(year)).await?;

    let expenses: i64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(amount), 0)
        FROM expenses
        WHERE strftime('%Y', expense_date) = ?
        "#,
    )
    .bind(&year_string)
    .fetch_one(pool)
    .await?;

    Ok(FinancialSummary::new(revenue, cogs, expenses))
}

// --------------------------------------------------
// ALL-TIME SUMMARY
// --------------------------------------------------

pub async fn all_time_summary(pool: &SqlitePool) -> Result<FinancialSummary, sqlx::Error> {
    let revenue: i64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(total), 0)
        FROM sales
        "#,
    )
    .fetch_one(pool)
    .await?;

    let cogs: i64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(
            SUM(si.quantity * p.cost_price),
            0
        )
        FROM sale_items si
        JOIN products p
            ON p.id = si.product_id
        "#,
    )
    .fetch_one(pool)
    .await?;

    let expenses: i64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(amount), 0)
        FROM expenses
        "#,
    )
    .fetch_one(pool)
    .await?;

    Ok(FinancialSummary::new(revenue, cogs, expenses))
}

// --------------------------------------------------
// MONTHLY HISTORY
// --------------------------------------------------

#[derive(Debug)]
pub struct MonthlySummary {
    pub year: i32,
    pub month: u32,
    pub revenue: i64,
    pub cogs: i64,
    pub gross_profit: i64,
    pub expenses: i64,
    pub net_profit: i64,
}

pub async fn monthly_history(pool: &SqlitePool) -> Result<Vec<MonthlySummary>, sqlx::Error> {
    let months = sqlx::query_as::<_, (String,)>(
        r#"
        SELECT month
        FROM (
            SELECT DISTINCT strftime('%Y-%m', sale_date) AS month
            FROM sales

            UNION

            SELECT DISTINCT strftime('%Y-%m', expense_date) AS month
            FROM expenses
        )
        WHERE month IS NOT NULL
        ORDER BY month
        "#,
    )
    .fetch_all(pool)
    .await?;

    let mut history = Vec::new();

    for (month_string,) in months {
        if month_string.len() != 7 {
            continue;
        }

        let year: i32 = month_string[0..4]
            .parse()
            .map_err(|_| sqlx::Error::Protocol("Invalid year in monthly history".into()))?;

        let month: u32 = month_string[5..7]
            .parse()
            .map_err(|_| sqlx::Error::Protocol("Invalid month in monthly history".into()))?;

        let summary = monthly_summary(pool, year, month).await?;

        history.push(MonthlySummary {
            year,
            month,
            revenue: summary.revenue,
            cogs: summary.cogs,
            gross_profit: summary.gross_profit,
            expenses: summary.expenses,
            net_profit: summary.net_profit,
        });
    }

    Ok(history)
}
