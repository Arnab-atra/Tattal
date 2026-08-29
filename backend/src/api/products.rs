use axum::{Json, extract::State, http::StatusCode};
use serde::{Deserialize, Serialize};
use sqlx::Row;

use crate::api::dashboard::AppState;
use crate::models::product::Product;

#[derive(Debug, Deserialize)]
pub struct CreateProductRequest {
    pub name: String,
    pub sku: Option<String>,
    pub category: Option<String>,
    pub cost_price: i64,
    pub selling_price: i64,
    pub stock_quantity: i64,
}

#[derive(Debug, Serialize)]
pub struct ProductResponse {
    pub id: String,
    pub name: String,
    pub sku: Option<String>,
    pub category: Option<String>,
    pub cost_price: i64,
    pub selling_price: i64,
    pub stock_quantity: i64,
    pub created_at: String,
    pub updated_at: String,
}

pub async fn create_product(
    State(state): State<AppState>,
    Json(request): Json<CreateProductRequest>,
) -> Result<(StatusCode, Json<ProductResponse>), (StatusCode, String)> {
    let product = crate::repositories::product::create_product(
        &state.pool,
        &request.name,
        request.sku.as_deref(),
        request.category.as_deref(),
        request.cost_price,
        request.selling_price,
        request.stock_quantity,
    )
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    let response = ProductResponse {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        cost_price: product.cost_price,
        selling_price: product.selling_price,
        stock_quantity: product.stock_quantity,
        created_at: product.created_at.to_rfc3339(),
        updated_at: product.updated_at.to_rfc3339(),
    };

    Ok((StatusCode::CREATED, Json(response)))
}

pub async fn list_products(
    State(state): State<AppState>,
) -> Result<Json<Vec<ProductResponse>>, (StatusCode, String)> {
    let rows = sqlx::query(
        r#"
        SELECT
            id,
            name,
            sku,
            category,
            cost_price,
            selling_price,
            stock_quantity,
            created_at,
            updated_at
        FROM products
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    let products: Vec<Product> = rows
        .into_iter()
        .map(|row| Product {
            id: row.get("id"),
            name: row.get("name"),
            sku: row.get("sku"),
            category: row.get("category"),
            cost_price: row.get("cost_price"),
            selling_price: row.get("selling_price"),
            stock_quantity: row.get("stock_quantity"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
        .collect();

    let response = products
        .into_iter()
        .map(|product| ProductResponse {
            id: product.id,
            name: product.name,
            sku: product.sku,
            category: product.category,
            cost_price: product.cost_price,
            selling_price: product.selling_price,
            stock_quantity: product.stock_quantity,
            created_at: product.created_at.to_rfc3339(),
            updated_at: product.updated_at.to_rfc3339(),
        })
        .collect();

    Ok(Json(response))
}

#[derive(Debug, Deserialize)]
pub struct UpdateProductRequest {
    pub name: String,
    pub sku: Option<String>,
    pub category: Option<String>,
    pub cost_price: i64,
    pub selling_price: i64,
}

pub async fn update_product(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(request): Json<UpdateProductRequest>,
) -> Result<Json<ProductResponse>, (StatusCode, String)> {
    if request.name.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Product name is required".to_string(),
        ));
    }

    if request.cost_price < 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Cost price cannot be negative".to_string(),
        ));
    }

    if request.selling_price < 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Selling price cannot be negative".to_string(),
        ));
    }

    let product = crate::repositories::product::update_product(
        &state.pool,
        &id,
        request.name.trim(),
        request.sku.as_deref(),
        request.category.as_deref(),
        request.cost_price,
        request.selling_price,
    )
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    let product = product.ok_or((StatusCode::NOT_FOUND, "Product not found".to_string()))?;

    let response = ProductResponse {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        cost_price: product.cost_price,
        selling_price: product.selling_price,
        stock_quantity: product.stock_quantity,
        created_at: product.created_at.to_rfc3339(),
        updated_at: product.updated_at.to_rfc3339(),
    };

    Ok(Json(response))
}

#[derive(Debug, Deserialize)]
pub struct AddStockRequest {
    pub quantity: i64,
}

pub async fn add_stock(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(request): Json<AddStockRequest>,
) -> Result<Json<ProductResponse>, (StatusCode, String)> {
    if request.quantity <= 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Stock quantity must be greater than zero".to_string(),
        ));
    }

    let mut transaction = state
        .pool
        .begin()
        .await
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    let now = chrono::Utc::now();

    let result = sqlx::query(
        r#"
        UPDATE products
        SET
            stock_quantity = stock_quantity + ?,
            updated_at = ?
        WHERE id = ?
        "#,
    )
    .bind(request.quantity)
    .bind(now)
    .bind(&id)
    .execute(&mut *transaction)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Product not found".to_string()));
    }

    let movement_id = uuid::Uuid::new_v4().to_string();

    sqlx::query(
        r#"
        INSERT INTO inventory_movements (
            id,
            product_id,
            movement_type,
            quantity,
            reference_type,
            reference_id,
            notes,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&movement_id)
    .bind(&id)
    .bind("IN")
    .bind(request.quantity)
    .bind("STOCK_ADJUSTMENT")
    .bind(None::<String>)
    .bind("Stock added")
    .bind(now)
    .execute(&mut *transaction)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    let product = sqlx::query_as::<_, Product>(
        r#"
        SELECT
            id,
            name,
            sku,
            category,
            cost_price,
            selling_price,
            stock_quantity,
            created_at,
            updated_at
        FROM products
        WHERE id = ?
        "#,
    )
    .bind(&id)
    .fetch_one(&mut *transaction)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    transaction
        .commit()
        .await
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    let response = ProductResponse {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        cost_price: product.cost_price,
        selling_price: product.selling_price,
        stock_quantity: product.stock_quantity,
        created_at: product.created_at.to_rfc3339(),
        updated_at: product.updated_at.to_rfc3339(),
    };

    Ok(Json(response))
}

#[derive(Debug, Serialize)]
pub struct InventoryMovementResponse {
    pub id: String,
    pub product_id: String,
    pub movement_type: String,
    pub quantity: i64,
    pub reference_type: Option<String>,
    pub reference_id: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

pub async fn list_inventory_movements(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<Json<Vec<InventoryMovementResponse>>, (StatusCode, String)> {
    let product_exists = sqlx::query(
        r#"
        SELECT id
        FROM products
        WHERE id = ?
        "#,
    )
    .bind(&id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    if product_exists.is_none() {
        return Err((StatusCode::NOT_FOUND, "Product not found".to_string()));
    }

    let rows = sqlx::query(
        r#"
        SELECT
            id,
            product_id,
            movement_type,
            quantity,
            reference_type,
            reference_id,
            notes,
            created_at
        FROM inventory_movements
        WHERE product_id = ?
        ORDER BY created_at DESC
        "#,
    )
    .bind(&id)
    .fetch_all(&state.pool)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    let movements = rows
        .into_iter()
        .map(|row| {
            let created_at: chrono::DateTime<chrono::Utc> = row.get("created_at");

            InventoryMovementResponse {
                id: row.get("id"),
                product_id: row.get("product_id"),
                movement_type: row.get("movement_type"),
                quantity: row.get("quantity"),
                reference_type: row.get("reference_type"),
                reference_id: row.get("reference_id"),
                notes: row.get("notes"),
                created_at: created_at.to_rfc3339(),
            }
        })
        .collect();

    Ok(Json(movements))
}
