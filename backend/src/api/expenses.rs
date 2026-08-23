use axum::{Json, extract::State, http::StatusCode};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::dashboard::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateExpenseRequest {
    pub category: String,
    pub description: Option<String>,
    pub amount: i64,
    pub payment_method: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ExpenseResponse {
    pub id: String,
    pub expense_date: String,
    pub category: String,
    pub description: Option<String>,
    pub amount: i64,
    pub payment_method: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub async fn list_expenses(
    State(state): State<AppState>,
) -> Result<Json<Vec<ExpenseResponse>>, (StatusCode, String)> {
    let rows = sqlx::query_as::<
        _,
        (
            String,
            String,
            String,
            Option<String>,
            i64,
            Option<String>,
            Option<String>,
            String,
            String,
        ),
    >(
        r#"
        SELECT
            id,
            expense_date,
            category,
            description,
            amount,
            payment_method,
            notes,
            created_at,
            updated_at
        FROM expenses
        ORDER BY expense_date DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(internal_error)?;

    let expenses = rows
        .into_iter()
        .map(
            |(
                id,
                expense_date,
                category,
                description,
                amount,
                payment_method,
                notes,
                created_at,
                updated_at,
            )| ExpenseResponse {
                id,
                expense_date,
                category,
                description,
                amount,
                payment_method,
                notes,
                created_at,
                updated_at,
            },
        )
        .collect();

    Ok(Json(expenses))
}

pub async fn create_expense(
    State(state): State<AppState>,
    Json(request): Json<CreateExpenseRequest>,
) -> Result<(StatusCode, Json<ExpenseResponse>), (StatusCode, String)> {
    if request.category.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "category cannot be empty".to_string(),
        ));
    }

    if request.amount < 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            "amount cannot be negative".to_string(),
        ));
    }

    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    sqlx::query(
        r#"
        INSERT INTO expenses (
            id,
            expense_date,
            category,
            description,
            amount,
            payment_method,
            notes,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&id)
    .bind(&now)
    .bind(&request.category)
    .bind(&request.description)
    .bind(request.amount)
    .bind(&request.payment_method)
    .bind(&request.notes)
    .bind(&now)
    .bind(&now)
    .execute(&state.pool)
    .await
    .map_err(internal_error)?;

    let expense = ExpenseResponse {
        id,
        expense_date: now.clone(),
        category: request.category,
        description: request.description,
        amount: request.amount,
        payment_method: request.payment_method,
        notes: request.notes,
        created_at: now.clone(),
        updated_at: now,
    };

    Ok((StatusCode::CREATED, Json(expense)))
}

fn internal_error(error: sqlx::Error) -> (StatusCode, String) {
    eprintln!("Database error: {error}");

    (
        StatusCode::INTERNAL_SERVER_ERROR,
        "Internal server error".to_string(),
    )
}
