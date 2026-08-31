// ============================================================
// DASHBOARD ENDPOINT
//
// Provides aggregated financial data for the dashboard.
// ============================================================

use axum::{Json, extract::State};
use chrono::{Datelike, Local};
use serde::Serialize;
use sqlx::SqlitePool;
use tracing::error;

use crate::reports::{
    growth::Growth,
    summary::{FinancialSummary, MonthlySummary},
};

// ============================================================
// TYPES
// ============================================================

#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
}

#[derive(Serialize)]
pub struct DashboardResponse {
    pub date: String,
    pub today: SummaryResponse,
    pub month: PeriodResponse,
    pub year: PeriodResponse,
    pub all_time: SummaryResponse,
    pub monthly_history: Vec<MonthlyHistoryResponse>,
}

#[derive(Serialize)]
pub struct SummaryResponse {
    pub revenue: i64,
    pub cogs: i64,
    pub gross_profit: i64,
    pub expenses: i64,
    pub net_profit: i64,
}

#[derive(Serialize)]
pub struct PeriodResponse {
    pub summary: SummaryResponse,
    pub growth: GrowthResponse,
}

#[derive(Serialize)]
pub struct GrowthResponse {
    pub revenue: Option<f64>,
    pub cogs: Option<f64>,
    pub gross_profit: Option<f64>,
    pub expenses: Option<f64>,
    pub net_profit: Option<f64>,
}

#[derive(Serialize)]
pub struct MonthlyHistoryResponse {
    pub year: i32,
    pub month: u32,
    pub revenue: i64,
    pub cogs: i64,
    pub gross_profit: i64,
    pub expenses: i64,
    pub net_profit: i64,
}

// ============================================================
// CONVERSIONS
// ============================================================

impl From<FinancialSummary> for SummaryResponse {
    fn from(summary: FinancialSummary) -> Self {
        Self {
            revenue: summary.revenue,
            cogs: summary.cogs,
            gross_profit: summary.gross_profit,
            expenses: summary.expenses,
            net_profit: summary.net_profit,
        }
    }
}

impl From<Growth> for GrowthResponse {
    fn from(growth: Growth) -> Self {
        Self {
            revenue: growth.revenue,
            cogs: growth.cogs,
            gross_profit: growth.gross_profit,
            expenses: growth.expenses,
            net_profit: growth.net_profit,
        }
    }
}

impl From<MonthlySummary> for MonthlyHistoryResponse {
    fn from(summary: MonthlySummary) -> Self {
        Self {
            year: summary.year,
            month: summary.month,
            revenue: summary.revenue,
            cogs: summary.cogs,
            gross_profit: summary.gross_profit,
            expenses: summary.expenses,
            net_profit: summary.net_profit,
        }
    }
}

// ============================================================
// ERROR HANDLING
// ============================================================

fn internal_error(error: sqlx::Error) -> String {
    error!("Database error in dashboard: {:?}", error);
    "Internal server error".to_string()
}

// ============================================================
// ENDPOINT HANDLER
// ============================================================

pub async fn dashboard(State(state): State<AppState>) -> Result<Json<DashboardResponse>, String> {
    let today = Local::now().date_naive();
    let today_string = today.format("%Y-%m-%d").to_string();
    let year = today.year();
    let month = today.month();

    let today_summary = crate::reports::summary::daily_summary(&state.pool, &today_string)
        .await
        .map_err(internal_error)?;

    let month_summary = crate::reports::summary::monthly_summary(&state.pool, year, month)
        .await
        .map_err(internal_error)?;

    let year_summary = crate::reports::summary::yearly_summary(&state.pool, year)
        .await
        .map_err(internal_error)?;

    let all_time = crate::reports::summary::all_time_summary(&state.pool)
        .await
        .map_err(internal_error)?;

    let monthly_growth = crate::reports::growth::monthly_growth(&state.pool, year, month)
        .await
        .map_err(internal_error)?;

    let yearly_growth = crate::reports::growth::yearly_growth(&state.pool, year)
        .await
        .map_err(internal_error)?;

    let history = crate::reports::summary::monthly_history(&state.pool)
        .await
        .map_err(internal_error)?;

    let response = DashboardResponse {
        date: today.format("%Y-%m-%d").to_string(),
        today: today_summary.into(),
        month: PeriodResponse {
            summary: month_summary.into(),
            growth: monthly_growth.into(),
        },
        year: PeriodResponse {
            summary: year_summary.into(),
            growth: yearly_growth.into(),
        },
        all_time: all_time.into(),
        monthly_history: history
            .into_iter()
            .map(MonthlyHistoryResponse::from)
            .collect(),
    };

    Ok(Json(response))
}
