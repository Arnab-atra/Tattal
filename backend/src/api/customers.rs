use axum::{Json, extract::State, http::StatusCode};
use serde::{Deserialize, Serialize};
use sqlx::Row;

use crate::api::dashboard::AppState;
use crate::models::customer::Customer;

#[derive(Debug, Deserialize)]
pub struct CreateCustomerRequest {
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CustomerResponse {
    pub id: String,
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub async fn create_customer(
    State(state): State<AppState>,
    Json(request): Json<CreateCustomerRequest>,
) -> Result<(StatusCode, Json<CustomerResponse>), (StatusCode, String)> {
    if request.name.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Customer name cannot be empty".to_string(),
        ));
    }

    let customer = crate::repositories::customer::create_customer(
        &state.pool,
        request.name.trim(),
        request.phone.as_deref(),
        request.email.as_deref(),
        request.notes.as_deref(),
    )
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    let response = CustomerResponse {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        notes: customer.notes,
        created_at: customer.created_at.to_rfc3339(),
        updated_at: customer.updated_at.to_rfc3339(),
    };

    Ok((StatusCode::CREATED, Json(response)))
}

#[derive(Debug, Deserialize)]
pub struct UpdateCustomerRequest {
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub notes: Option<String>,
}

pub async fn update_customer(
    State(state): State<AppState>,
    axum::extract::Path(customer_id): axum::extract::Path<String>,
    Json(request): Json<UpdateCustomerRequest>,
) -> Result<Json<CustomerResponse>, (StatusCode, String)> {
    if request.name.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Customer name cannot be empty".to_string(),
        ));
    }

    let customer = crate::repositories::customer::update_customer(
        &state.pool,
        &customer_id,
        request.name.trim(),
        request.phone.as_deref(),
        request.email.as_deref(),
        request.notes.as_deref(),
    )
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    let customer = match customer {
        Some(customer) => customer,
        None => {
            return Err((StatusCode::NOT_FOUND, "Customer not found.".to_string()));
        }
    };

    let response = CustomerResponse {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        notes: customer.notes,
        created_at: customer.created_at.to_rfc3339(),
        updated_at: customer.updated_at.to_rfc3339(),
    };

    Ok(Json(response))
}

pub async fn list_customers(
    State(state): State<AppState>,
) -> Result<Json<Vec<CustomerResponse>>, (StatusCode, String)> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            name,
            phone,
            email,
            notes,
            created_at,
            updated_at
        FROM customers
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    let customers: Vec<Customer> = rows
        .into_iter()
        .map(|row| Customer {
            id: row.get("id"),
            name: row.get("name"),
            phone: row.get("phone"),
            email: row.get("email"),
            notes: row.get("notes"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
        .collect();

    let response = customers
        .into_iter()
        .map(|customer| CustomerResponse {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            notes: customer.notes,
            created_at: customer.created_at.to_rfc3339(),
            updated_at: customer.updated_at.to_rfc3339(),
        })
        .collect();

    Ok(Json(response))
}

#[derive(Debug, Serialize)]
pub struct CustomerSaleResponse {
    pub id: String,
    pub sale_date: String,
    pub total: i64,
    pub paid: i64,
    pub payment_method: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CustomerDetailResponse {
    pub id: String,
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,

    pub sales_count: i64,
    pub total_purchases: i64,
    pub total_paid: i64,

    pub sales: Vec<CustomerSaleResponse>,
}

pub async fn get_customer(
    State(state): State<AppState>,
    axum::extract::Path(customer_id): axum::extract::Path<String>,
) -> Result<Json<CustomerDetailResponse>, (StatusCode, String)> {
    let customer = sqlx::query(
        r#"
        SELECT
            id,
            name,
            phone,
            email,
            notes,
            created_at,
            updated_at
        FROM customers
        WHERE id = ?
        "#,
    )
    .bind(&customer_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    let customer = match customer {
        Some(row) => row,
        None => {
            return Err((StatusCode::NOT_FOUND, "Customer not found.".to_string()));
        }
    };

    let sales = sqlx::query(
        r#"
        SELECT
            s.id,
            s.sale_date,
            s.total,
            COALESCE(SUM(p.amount), 0) AS paid,
            (
                SELECT p2.payment_method
                FROM payments p2
                WHERE p2.sale_id = s.id
                ORDER BY p2.rowid DESC
                LIMIT 1
            ) AS payment_method
        FROM sales s
        LEFT JOIN payments p ON p.sale_id = s.id
        WHERE s.customer_id = ?
        GROUP BY s.id
        ORDER BY s.sale_date DESC
        "#,
    )
    .bind(&customer_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    let mut sales_response = Vec::new();

    let mut total_purchases = 0i64;
    let mut total_paid = 0i64;

    for row in sales {
        let id: String = row.get("id");
        let sale_date: chrono::DateTime<chrono::Utc> = row.get("sale_date");
        let total: i64 = row.get("total");
        let paid: i64 = row.get("paid");
        let payment_method: Option<String> = row.get("payment_method");

        total_purchases += total;
        total_paid += paid;

        sales_response.push(CustomerSaleResponse {
            id,
            sale_date: sale_date.to_rfc3339(),
            total,
            paid,
            payment_method,
        });
    }

    let sales_count = sales_response.len() as i64;

    let response = CustomerDetailResponse {
        id: customer.get("id"),
        name: customer.get("name"),
        phone: customer.get("phone"),
        email: customer.get("email"),
        notes: customer.get("notes"),
        created_at: customer
            .get::<chrono::DateTime<chrono::Utc>, _>("created_at")
            .to_rfc3339(),
        updated_at: customer
            .get::<chrono::DateTime<chrono::Utc>, _>("updated_at")
            .to_rfc3339(),

        sales_count,
        total_purchases,
        total_paid,

        sales: sales_response,
    };

    Ok(Json(response))
}
