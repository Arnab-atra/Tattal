use axum::{Json, extract::Path, extract::State, http::StatusCode};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use crate::api::dashboard::AppState;

// ============================================================
// CREATE SALE REQUESTS
// ============================================================

#[derive(Debug, Deserialize)]
pub struct CreateSaleRequest {
    pub customer_id: Option<String>,
    pub items: Vec<SaleItemRequest>,
    pub discount: i64,
    pub payment: PaymentRequest,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SaleItemRequest {
    pub product_id: String,
    pub quantity: i64,
}

#[derive(Debug, Deserialize)]
pub struct PaymentRequest {
    pub amount: i64,
    pub payment_method: String,
    pub reference: Option<String>,
}

// ============================================================
// BASIC SALE RESPONSE
//
// Used when creating a sale.
// ============================================================

#[derive(Debug, Serialize)]
pub struct SaleResponse {
    pub id: String,
    pub customer_id: Option<String>,
    pub sale_date: String,
    pub subtotal: i64,
    pub discount: i64,
    pub total: i64,
    pub notes: Option<String>,
}

// ============================================================
// SALES HISTORY RESPONSE
//
// This is specifically for GET /api/sales.
// ============================================================

#[derive(Debug, Serialize)]
pub struct SaleHistoryResponse {
    pub id: String,
    pub customer_id: Option<String>,
    pub customer_name: String,
    pub sale_date: String,

    pub item_count: i64,

    pub subtotal: i64,
    pub discount: i64,
    pub total: i64,

    pub paid: i64,
    pub payment_method: Option<String>,

    pub status: String,

    pub notes: Option<String>,
}

// ============================================================
// SALE DETAIL RESPONSES
// ============================================================

#[derive(Debug, Serialize)]
pub struct SaleItemResponse {
    pub id: String,
    pub product_id: String,
    pub product_name: String,
    pub sku: Option<String>,
    pub quantity: i64,
    pub unit_price: i64,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct PaymentResponse {
    pub id: String,
    pub amount: i64,
    pub payment_method: String,
    pub reference: Option<String>,
    pub payment_date: String,
}

#[derive(Debug, Serialize)]
pub struct SaleDetailResponse {
    pub id: String,
    pub customer_id: Option<String>,
    pub sale_date: String,
    pub subtotal: i64,
    pub discount: i64,
    pub total: i64,
    pub notes: Option<String>,
    pub items: Vec<SaleItemResponse>,
    pub payments: Vec<PaymentResponse>,
}

// ============================================================
// CREATE SALE
// ============================================================

pub async fn create_sale(
    State(state): State<AppState>,
    Json(request): Json<CreateSaleRequest>,
) -> Result<(StatusCode, Json<SaleResponse>), (StatusCode, String)> {
    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if request.items.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Sale must contain at least one item".to_string(),
        ));
    }

    if request.discount < 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Discount cannot be negative".to_string(),
        ));
    }

    if request.payment.amount < 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Payment amount cannot be negative".to_string(),
        ));
    }

    if request.payment.payment_method.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Payment method is required".to_string(),
        ));
    }

    for item in &request.items {
        if item.product_id.trim().is_empty() {
            return Err((
                StatusCode::BAD_REQUEST,
                "Product is required for every sale item".to_string(),
            ));
        }

        if item.quantity <= 0 {
            return Err((
                StatusCode::BAD_REQUEST,
                "Quantity must be greater than zero".to_string(),
            ));
        }
    }

    // --------------------------------------------------------
    // SALE ID
    // --------------------------------------------------------

    let sale_id = Uuid::new_v4().to_string();

    // --------------------------------------------------------
    // TRANSACTION
    // --------------------------------------------------------

    let mut transaction = state
        .pool
        .begin()
        .await
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    // --------------------------------------------------------
    // CUSTOMER VALIDATION
    // --------------------------------------------------------

    if let Some(customer_id) = &request.customer_id {
        let customer_exists = sqlx::query(
            r#"
            SELECT id
            FROM customers
            WHERE id = ?
            "#,
        )
        .bind(customer_id)
        .fetch_optional(&mut *transaction)
        .await
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

        if customer_exists.is_none() {
            return Err((StatusCode::BAD_REQUEST, "Customer not found".to_string()));
        }
    }

    // --------------------------------------------------------
    // CALCULATE SUBTOTAL
    //
    // Price always comes from the database.
    // --------------------------------------------------------

    let mut subtotal: i64 = 0;

    let mut resolved_items: Vec<(String, i64, i64, i64)> = Vec::new();

    for item in &request.items {
        let product = sqlx::query(
            r#"
            SELECT
                id,
                selling_price,
                cost_price,
                stock_quantity
            FROM products
            WHERE id = ?
            "#,
        )
        .bind(&item.product_id)
        .fetch_optional(&mut *transaction)
        .await
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

        let product = match product {
            Some(product) => product,
            None => {
                return Err((
                    StatusCode::BAD_REQUEST,
                    format!("Product not found: {}", item.product_id),
                ));
            }
        };

        let selling_price: i64 = product
            .try_get("selling_price")
            .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

        let cost_price: i64 = product
            .try_get("cost_price")
            .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

        let stock_quantity: i64 = product
            .try_get("stock_quantity")
            .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

        if item.quantity > stock_quantity {
            return Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "Insufficient stock for product {}. Available: {}, requested: {}",
                    item.product_id, stock_quantity, item.quantity
                ),
            ));
        }

        let item_total = item.quantity.checked_mul(selling_price).ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                "Sale item total is too large".to_string(),
            )
        })?;

        subtotal = subtotal.checked_add(item_total).ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                "Sale subtotal is too large".to_string(),
            )
        })?;

        resolved_items.push((
            item.product_id.clone(),
            item.quantity,
            selling_price,
            cost_price,
        ));

        // ----------------------------------------------------
        // REDUCE STOCK
        // ----------------------------------------------------

        sqlx::query(
            r#"
            UPDATE products
            SET
                stock_quantity = stock_quantity - ?,
                updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(item.quantity)
        .bind(Utc::now())
        .bind(&item.product_id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

        // ----------------------------------------------------
        // INVENTORY MOVEMENT
        // ----------------------------------------------------

        let movement_id = Uuid::new_v4().to_string();
        let movement_time = Utc::now();

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
        .bind(&item.product_id)
        .bind("OUT")
        .bind(item.quantity)
        .bind("SALE")
        .bind(&sale_id)
        .bind(&request.notes)
        .bind(movement_time)
        .execute(&mut *transaction)
        .await
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;
    }

    // --------------------------------------------------------
    // CALCULATE TOTAL
    // --------------------------------------------------------

    if request.discount > subtotal {
        return Err((
            StatusCode::BAD_REQUEST,
            "Discount cannot be greater than subtotal".to_string(),
        ));
    }

    let total = subtotal - request.discount;

    if total <= 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Sale total must be greater than zero".to_string(),
        ));
    }

    // --------------------------------------------------------
    // PAYMENT VALIDATION
    // --------------------------------------------------------

    if request.payment.amount != total {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "Payment amount must equal sale total (₹{:.2})",
                total as f64 / 100.0
            ),
        ));
    }

    // --------------------------------------------------------
    // CREATE SALE
    // --------------------------------------------------------

    let now = Utc::now();

    sqlx::query(
        r#"
        INSERT INTO sales (
            id,
            customer_id,
            sale_date,
            subtotal,
            discount,
            total,
            notes,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&sale_id)
    .bind(&request.customer_id)
    .bind(now)
    .bind(subtotal)
    .bind(request.discount)
    .bind(total)
    .bind(&request.notes)
    .bind(now)
    .bind(now)
    .execute(&mut *transaction)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    // --------------------------------------------------------
    // CREATE SALE ITEMS
    // --------------------------------------------------------

    for (product_id, quantity, unit_price, cost_price) in resolved_items {
        let item_id = Uuid::new_v4().to_string();

        let item_total = quantity.checked_mul(unit_price).ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                "Sale item total is too large".to_string(),
            )
        })?;

        sqlx::query(
            r#"
            INSERT INTO sale_items (
                id,
                sale_id,
                product_id,
                quantity,
                unit_price,
                cost_price,
                total
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(item_id)
        .bind(&sale_id)
        .bind(&product_id)
        .bind(quantity)
        .bind(unit_price)
        .bind(cost_price)
        .bind(item_total)
        .execute(&mut *transaction)
        .await
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;
    }

    // --------------------------------------------------------
    // CREATE PAYMENT
    // --------------------------------------------------------

    let payment_id = Uuid::new_v4().to_string();

    sqlx::query(
        r#"
        INSERT INTO payments (
            id,
            sale_id,
            payment_date,
            amount,
            payment_method,
            reference,
            notes,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(payment_id)
    .bind(&sale_id)
    .bind(now)
    .bind(request.payment.amount)
    .bind(&request.payment.payment_method)
    .bind(&request.payment.reference)
    .bind::<Option<String>>(None)
    .bind(now)
    .execute(&mut *transaction)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    // --------------------------------------------------------
    // COMMIT
    // --------------------------------------------------------

    transaction
        .commit()
        .await
        .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    let response = SaleResponse {
        id: sale_id,
        customer_id: request.customer_id,
        sale_date: now.to_rfc3339(),
        subtotal,
        discount: request.discount,
        total,
        notes: request.notes,
    };

    Ok((StatusCode::CREATED, Json(response)))
}

// ============================================================
// LIST SALES
//
// This endpoint now returns everything needed by Sales History.
// ============================================================

pub async fn list_sales(
    State(state): State<AppState>,
) -> Result<Json<Vec<SaleHistoryResponse>>, (StatusCode, String)> {
    let rows = sqlx::query(
        r#"
        SELECT
            s.id,
            s.customer_id,

            COALESCE(c.name, 'Walk-in Customer') AS customer_name,

            s.sale_date,

            COALESCE(
                SUM(si.quantity),
                0
            ) AS item_count,

            s.subtotal,
            s.discount,
            s.total,

            COALESCE(
                SUM(pay.amount),
                0
            ) AS paid,

            GROUP_CONCAT(
                DISTINCT pay.payment_method
            ) AS payment_method,

            CASE
                WHEN COALESCE(SUM(pay.amount), 0) >= s.total
                    THEN 'PAID'

                WHEN COALESCE(SUM(pay.amount), 0) > 0
                    THEN 'PARTIAL'

                ELSE 'UNPAID'
            END AS status,

            s.notes

        FROM sales s

        LEFT JOIN customers c
            ON c.id = s.customer_id

        LEFT JOIN sale_items si
            ON si.sale_id = s.id

        LEFT JOIN payments pay
            ON pay.sale_id = s.id

        GROUP BY
            s.id,
            s.customer_id,
            c.name,
            s.sale_date,
            s.subtotal,
            s.discount,
            s.total,
            s.notes

        ORDER BY s.sale_date DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    let sales = rows
        .into_iter()
        .map(|row| SaleHistoryResponse {
            id: row.get("id"),
            customer_id: row.get("customer_id"),
            customer_name: row.get("customer_name"),
            sale_date: row
                .get::<chrono::DateTime<Utc>, _>("sale_date")
                .to_rfc3339(),

            item_count: row.get("item_count"),

            subtotal: row.get("subtotal"),
            discount: row.get("discount"),
            total: row.get("total"),

            paid: row.get("paid"),
            payment_method: row.get("payment_method"),

            status: row.get("status"),

            notes: row.get("notes"),
        })
        .collect();

    Ok(Json(sales))
}

// ============================================================
// GET SALE DETAILS
// ============================================================

pub async fn get_sale(
    State(state): State<AppState>,
    Path(sale_id): Path<String>,
) -> Result<Json<SaleDetailResponse>, (StatusCode, String)> {
    let sale = sqlx::query(
        r#"
        SELECT
            id,
            customer_id,
            sale_date,
            subtotal,
            discount,
            total,
            notes
        FROM sales
        WHERE id = ?
        "#,
    )
    .bind(&sale_id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    let sale = match sale {
        Some(sale) => sale,
        None => {
            return Err((StatusCode::NOT_FOUND, "Sale not found".to_string()));
        }
    };

    // --------------------------------------------------------
    // SALE ITEMS
    // --------------------------------------------------------

    let item_rows = sqlx::query(
        r#"
        SELECT
            si.id,
            si.product_id,
            p.name AS product_name,
            p.sku,
            si.quantity,
            si.unit_price,
            si.total
        FROM sale_items si
        JOIN products p
            ON p.id = si.product_id
        WHERE si.sale_id = ?
        ORDER BY si.id
        "#,
    )
    .bind(&sale_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    let items = item_rows
        .into_iter()
        .map(|row| SaleItemResponse {
            id: row.get("id"),
            product_id: row.get("product_id"),
            product_name: row.get("product_name"),
            sku: row.get("sku"),
            quantity: row.get("quantity"),
            unit_price: row.get("unit_price"),
            total: row.get("total"),
        })
        .collect();

    // --------------------------------------------------------
    // PAYMENTS
    // --------------------------------------------------------

    let payment_rows = sqlx::query(
        r#"
        SELECT
            id,
            amount,
            payment_method,
            reference,
            payment_date
        FROM payments
        WHERE sale_id = ?
        ORDER BY payment_date
        "#,
    )
    .bind(&sale_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|error| (StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))?;

    let payments = payment_rows
        .into_iter()
        .map(|row| PaymentResponse {
            id: row.get("id"),
            amount: row.get("amount"),
            payment_method: row.get("payment_method"),
            reference: row.get("reference"),
            payment_date: row
                .get::<chrono::DateTime<Utc>, _>("payment_date")
                .to_rfc3339(),
        })
        .collect();

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    let response = SaleDetailResponse {
        id: sale.get("id"),
        customer_id: sale.get("customer_id"),
        sale_date: sale
            .get::<chrono::DateTime<Utc>, _>("sale_date")
            .to_rfc3339(),
        subtotal: sale.get("subtotal"),
        discount: sale.get("discount"),
        total: sale.get("total"),
        notes: sale.get("notes"),
        items,
        payments,
    };

    Ok(Json(response))
}
