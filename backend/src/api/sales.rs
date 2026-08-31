// ============================================================
// SALES API HANDLERS
//
// Provides endpoints for:
// - Creating a sale (atomic transaction with stock reduction)
// - Listing sales with summary
// - Retrieving a single sale with items and payments
// ============================================================

use std::collections::HashMap;

use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use crate::api::dashboard::AppState;

// ============================================================
// REQUEST TYPES
// ============================================================

/// Request to create a new sale.
#[derive(Debug, Deserialize)]
pub struct CreateSaleRequest {
    pub customer_id: Option<String>,
    pub items: Vec<SaleItemRequest>,
    pub discount: i64,
    pub payment: PaymentRequest,
    pub notes: Option<String>,
}

/// A single product line in a sale.
#[derive(Debug, Deserialize)]
pub struct SaleItemRequest {
    pub product_id: String,
    pub quantity: i64,
}

/// Payment details for a sale.
#[derive(Debug, Deserialize)]
pub struct PaymentRequest {
    pub amount: i64,
    pub payment_method: String,
    pub reference: Option<String>,
}

// ============================================================
// RESPONSE TYPES
// ============================================================

/// Basic sale response returned after creation.
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

/// Sale summary used by sales history.
#[derive(Debug, Serialize)]
pub struct SaleHistoryResponse {
    pub id: String,
    pub customer_id: Option<String>,
    pub customer_name: String,
    pub sale_date: String,

    /// Number of sale-item rows.
    pub item_count: i64,

    /// Sum of all product quantities sold.
    pub total_quantity: i64,

    pub subtotal: i64,
    pub discount: i64,
    pub total: i64,

    /// Total amount paid across all payments.
    pub paid: i64,

    /// Distinct payment methods used.
    pub payment_method: Option<String>,

    /// PAID / PARTIAL / UNPAID.
    pub status: String,

    pub notes: Option<String>,
}

/// A single sale item in the detail response.
#[derive(Debug, Serialize)]
pub struct SaleItemResponse {
    pub id: String,
    pub product_id: String,
    pub product_name: String,
    pub sku: Option<String>,
    pub quantity: i64,
    pub unit_price: i64,

    /// Historical cost price at the time of sale.
    pub cost_price: i64,

    pub total: i64,
}

/// A payment in the sale detail response.
#[derive(Debug, Serialize)]
pub struct PaymentResponse {
    pub id: String,
    pub amount: i64,
    pub payment_method: String,
    pub reference: Option<String>,
    pub payment_date: String,
}

/// Complete sale detail.
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
// ERROR HELPERS
// ============================================================

/// Converts a database error into a generic HTTP 500 response.
fn internal_error(error: sqlx::Error) -> (StatusCode, String) {
    tracing::error!("Database error: {:?}", error);

    (
        StatusCode::INTERNAL_SERVER_ERROR,
        "Internal server error".to_string(),
    )
}

// ============================================================
// CREATE SALE
// ============================================================

pub async fn create_sale(
    State(state): State<AppState>,
    Json(request): Json<CreateSaleRequest>,
) -> Result<(StatusCode, Json<SaleResponse>), (StatusCode, String)> {
    // ------------------------------------------------------------
    // 1. BASIC VALIDATION
    // ------------------------------------------------------------

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

    // ------------------------------------------------------------
    // 2. NORMALIZE PAYMENT METHOD
    // ------------------------------------------------------------

    let payment_method = request.payment.payment_method.trim();

    if payment_method.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Payment method is required".to_string(),
        ));
    }

    let payment_method = payment_method.to_string();

    // ------------------------------------------------------------
    // 3. NORMALIZE CUSTOMER ID
    // ------------------------------------------------------------
    //
    // Empty or whitespace-only customer IDs are treated as None.
    //

    let customer_id = request.customer_id.and_then(|id| {
        let trimmed = id.trim();

        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    });

    // ------------------------------------------------------------
    // 4. NORMALIZE SALE ITEMS
    // ------------------------------------------------------------
    //
    // Duplicate product IDs are merged.
    //
    // Example:
    //
    // product A -> 2
    // product B -> 1
    // product A -> 3
    //
    // becomes:
    //
    // product A -> 5
    // product B -> 1
    //
    // Original product order is preserved.
    //

    let mut quantities: HashMap<String, i64> = HashMap::new();
    let mut product_order: Vec<String> = Vec::new();

    for item in &request.items {
        let product_id = item.product_id.trim();

        if product_id.is_empty() {
            return Err((
                StatusCode::BAD_REQUEST,
                "Product ID cannot be empty".to_string(),
            ));
        }

        if item.quantity <= 0 {
            return Err((
                StatusCode::BAD_REQUEST,
                "Quantity must be greater than zero".to_string(),
            ));
        }

        if !quantities.contains_key(product_id) {
            product_order.push(product_id.to_string());
        }

        let entry = quantities.entry(product_id.to_string()).or_insert(0);

        *entry = entry.checked_add(item.quantity).ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                "Total quantity for a product is too large".to_string(),
            )
        })?;
    }

    // ------------------------------------------------------------
    // 5. START DATABASE TRANSACTION
    // ------------------------------------------------------------

    let sale_id = Uuid::new_v4().to_string();

    let mut transaction = state.pool.begin().await.map_err(internal_error)?;

    // ------------------------------------------------------------
    // 6. VALIDATE CUSTOMER
    // ------------------------------------------------------------

    if let Some(ref cust_id) = customer_id {
        let customer_exists = sqlx::query(
            r#"
            SELECT id
            FROM customers
            WHERE id = ?
            "#,
        )
        .bind(cust_id)
        .fetch_optional(&mut *transaction)
        .await
        .map_err(internal_error)?;

        if customer_exists.is_none() {
            return Err((StatusCode::BAD_REQUEST, "Customer not found".to_string()));
        }
    }

    // ------------------------------------------------------------
    // 7. RESOLVE PRODUCTS, CALCULATE SUBTOTAL & CHECK STOCK
    // ------------------------------------------------------------

    let mut subtotal: i64 = 0;

    // product_id, quantity, selling_price, cost_price
    let mut resolved_items: Vec<(String, i64, i64, i64)> = Vec::new();

    for product_id in &product_order {
        let quantity = *quantities
            .get(product_id)
            .expect("product_id must exist in quantities");

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
        .bind(product_id)
        .fetch_optional(&mut *transaction)
        .await
        .map_err(internal_error)?;

        let product = match product {
            Some(product) => product,
            None => {
                return Err((
                    StatusCode::BAD_REQUEST,
                    format!("Product not found: {}", product_id),
                ));
            }
        };

        let selling_price: i64 = product.try_get("selling_price").map_err(internal_error)?;

        let cost_price: i64 = product.try_get("cost_price").map_err(internal_error)?;

        let stock_quantity: i64 = product.try_get("stock_quantity").map_err(internal_error)?;

        // --------------------------------------------------------
        // STOCK VALIDATION
        // --------------------------------------------------------

        if quantity > stock_quantity {
            return Err((
                StatusCode::BAD_REQUEST,
                format!(
                    "Insufficient stock for product {}. Available: {}, requested: {}",
                    product_id, stock_quantity, quantity
                ),
            ));
        }

        // --------------------------------------------------------
        // ITEM TOTAL
        // --------------------------------------------------------

        let item_total = quantity.checked_mul(selling_price).ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                "Sale item total is too large".to_string(),
            )
        })?;

        // --------------------------------------------------------
        // SUBTOTAL
        // --------------------------------------------------------

        subtotal = subtotal.checked_add(item_total).ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                "Sale subtotal is too large".to_string(),
            )
        })?;

        resolved_items.push((product_id.clone(), quantity, selling_price, cost_price));
    }

    // ------------------------------------------------------------
    // 8. VALIDATE DISCOUNT & TOTAL
    // ------------------------------------------------------------

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

    // ------------------------------------------------------------
    // 9. VALIDATE PAYMENT
    // ------------------------------------------------------------
    //
    // Partial payment is allowed.
    //

    if request.payment.amount > total {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "Payment amount cannot exceed sale total (₹{:.2})",
                total as f64 / 100.0
            ),
        ));
    }

    let now = Utc::now();

    // ------------------------------------------------------------
    // 10. CREATE SALE HEADER
    // ------------------------------------------------------------

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
    .bind(&customer_id)
    .bind(now)
    .bind(subtotal)
    .bind(request.discount)
    .bind(total)
    .bind(&request.notes)
    .bind(now)
    .bind(now)
    .execute(&mut *transaction)
    .await
    .map_err(internal_error)?;

    // ------------------------------------------------------------
    // 11. CREATE SALE ITEMS & INVENTORY MOVEMENTS
    // ------------------------------------------------------------
    //
    // IMPORTANT:
    //
    // The inventory trigger is responsible for updating
    // products.stock_quantity.
    //
    // Movement convention:
    //
    //   Positive = stock enters
    //   Negative = stock leaves
    //
    // Therefore SALE uses -quantity.
    //

    for (product_id, quantity, unit_price, cost_price) in resolved_items {
        let item_id = Uuid::new_v4().to_string();

        // --------------------------------------------------------
        // SALE ITEM TOTAL
        // --------------------------------------------------------

        let item_total = quantity.checked_mul(unit_price).ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                "Sale item total is too large".to_string(),
            )
        })?;

        // --------------------------------------------------------
        // INSERT SALE ITEM
        // --------------------------------------------------------

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
        .bind(&item_id)
        .bind(&sale_id)
        .bind(&product_id)
        .bind(quantity)
        .bind(unit_price)
        .bind(cost_price)
        .bind(item_total)
        .execute(&mut *transaction)
        .await
        .map_err(internal_error)?;

        // --------------------------------------------------------
        // INSERT INVENTORY MOVEMENT
        // --------------------------------------------------------

        let movement_id = Uuid::new_v4().to_string();

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
        .bind(&product_id)
        .bind("SALE")
        .bind(-quantity)
        .bind("SALE")
        .bind(&sale_id)
        .bind(&request.notes)
        .bind(now)
        .execute(&mut *transaction)
        .await
        .map_err(internal_error)?;
    }

    // ------------------------------------------------------------
    // 12. CREATE PAYMENT
    // ------------------------------------------------------------

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
    .bind(&payment_id)
    .bind(&sale_id)
    .bind(now)
    .bind(request.payment.amount)
    .bind(&payment_method)
    .bind(&request.payment.reference)
    .bind::<Option<String>>(None)
    .bind(now)
    .execute(&mut *transaction)
    .await
    .map_err(internal_error)?;

    // ------------------------------------------------------------
    // 13. COMMIT TRANSACTION
    // ------------------------------------------------------------

    transaction.commit().await.map_err(internal_error)?;

    // ------------------------------------------------------------
    // 14. RESPONSE
    // ------------------------------------------------------------

    let response = SaleResponse {
        id: sale_id,
        customer_id,
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
// ============================================================
//
// Uses correlated subqueries instead of joining both sale_items
// and payments directly. This prevents row multiplication.
//
// Example:
//
// 3 sale items × 2 payments = 6 joined rows.
//
// The subqueries avoid that problem.
// ============================================================

pub async fn list_sales(
    State(state): State<AppState>,
) -> Result<Json<Vec<SaleHistoryResponse>>, (StatusCode, String)> {
    let rows = sqlx::query(
        r#"
        SELECT
            s.id,
            s.customer_id,

            COALESCE(
                c.name,
                'Walk-in Customer'
            ) AS customer_name,

            s.sale_date,

            -- Number of sale-item rows
            COALESCE(
                (
                    SELECT COUNT(si.id)
                    FROM sale_items si
                    WHERE si.sale_id = s.id
                ),
                0
            ) AS item_count,

            -- Total quantity sold
            COALESCE(
                (
                    SELECT SUM(si.quantity)
                    FROM sale_items si
                    WHERE si.sale_id = s.id
                ),
                0
            ) AS total_quantity,

            s.subtotal,
            s.discount,
            s.total,

            -- Total amount paid
            COALESCE(
                (
                    SELECT SUM(pay.amount)
                    FROM payments pay
                    WHERE pay.sale_id = s.id
                ),
                0
            ) AS paid,

            -- Distinct payment methods
            (
                SELECT GROUP_CONCAT(
                    DISTINCT pay.payment_method
                )
                FROM payments pay
                WHERE pay.sale_id = s.id
            ) AS payment_method,

            -- Payment status
            CASE
                WHEN COALESCE(
                    (
                        SELECT SUM(pay.amount)
                        FROM payments pay
                        WHERE pay.sale_id = s.id
                    ),
                    0
                ) >= s.total
                    THEN 'PAID'

                WHEN COALESCE(
                    (
                        SELECT SUM(pay.amount)
                        FROM payments pay
                        WHERE pay.sale_id = s.id
                    ),
                    0
                ) > 0
                    THEN 'PARTIAL'

                ELSE 'UNPAID'
            END AS status,

            s.notes

        FROM sales s

        LEFT JOIN customers c
            ON c.id = s.customer_id

        ORDER BY s.sale_date DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(internal_error)?;

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
            total_quantity: row.get("total_quantity"),
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
    // ------------------------------------------------------------
    // 1. GET SALE HEADER
    // ------------------------------------------------------------

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
    .map_err(internal_error)?;

    let sale = match sale {
        Some(sale) => sale,
        None => {
            return Err((StatusCode::NOT_FOUND, "Sale not found".to_string()));
        }
    };

    // ------------------------------------------------------------
    // 2. GET SALE ITEMS
    // ------------------------------------------------------------

    let item_rows = sqlx::query(
        r#"
        SELECT
            si.id,
            si.product_id,
            p.name AS product_name,
            p.sku,
            si.quantity,
            si.unit_price,
            si.cost_price,
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
    .map_err(internal_error)?;

    let items = item_rows
        .into_iter()
        .map(|row| SaleItemResponse {
            id: row.get("id"),
            product_id: row.get("product_id"),
            product_name: row.get("product_name"),
            sku: row.get("sku"),
            quantity: row.get("quantity"),
            unit_price: row.get("unit_price"),
            cost_price: row.get("cost_price"),
            total: row.get("total"),
        })
        .collect();

    // ------------------------------------------------------------
    // 3. GET PAYMENTS
    // ------------------------------------------------------------

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
    .map_err(internal_error)?;

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

    // ------------------------------------------------------------
    // 4. BUILD RESPONSE
    // ------------------------------------------------------------

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
