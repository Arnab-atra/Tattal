use sqlx::SqlitePool;

use super::summary::{monthly_summary, yearly_summary};

#[derive(Debug)]
pub struct Growth {
    pub revenue: Option<f64>,
    pub cogs: Option<f64>,
    pub gross_profit: Option<f64>,
    pub expenses: Option<f64>,
    pub net_profit: Option<f64>,
}

// --------------------------------------------------
// GROWTH CALCULATION
// --------------------------------------------------

fn calculate_growth(current: i64, previous: i64) -> Option<f64> {
    if previous == 0 {
        return None;
    }

    Some(((current - previous) as f64 / previous as f64) * 100.0)
}

// --------------------------------------------------
// MONTHLY GROWTH
// --------------------------------------------------

pub async fn monthly_growth(
    pool: &SqlitePool,
    year: i32,
    month: u32,
) -> Result<Growth, sqlx::Error> {
    let current = monthly_summary(pool, year, month).await?;

    let (previous_year, previous_month) = if month == 1 {
        (year - 1, 12)
    } else {
        (year, month - 1)
    };

    let previous = monthly_summary(pool, previous_year, previous_month).await?;

    Ok(Growth {
        revenue: calculate_growth(current.revenue, previous.revenue),

        cogs: calculate_growth(current.cogs, previous.cogs),

        gross_profit: calculate_growth(current.gross_profit, previous.gross_profit),

        expenses: calculate_growth(current.expenses, previous.expenses),

        net_profit: calculate_growth(current.net_profit, previous.net_profit),
    })
}

// --------------------------------------------------
// YEARLY GROWTH
// --------------------------------------------------

pub async fn yearly_growth(pool: &SqlitePool, year: i32) -> Result<Growth, sqlx::Error> {
    let current = yearly_summary(pool, year).await?;

    let previous = yearly_summary(pool, year - 1).await?;

    Ok(Growth {
        revenue: calculate_growth(current.revenue, previous.revenue),

        cogs: calculate_growth(current.cogs, previous.cogs),

        gross_profit: calculate_growth(current.gross_profit, previous.gross_profit),

        expenses: calculate_growth(current.expenses, previous.expenses),

        net_profit: calculate_growth(current.net_profit, previous.net_profit),
    })
}
