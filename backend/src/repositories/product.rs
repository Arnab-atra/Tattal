use chrono::Utc;
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::product::Product;

pub async fn create_product(
    pool: &SqlitePool,
    name: &str,
    sku: Option<&str>,
    category: Option<&str>,
    cost_price: i64,
    selling_price: i64,
    stock_quantity: i64,
) -> Result<Product, sqlx::Error> {
    if name.trim().is_empty() {
        return Err(sqlx::Error::Protocol("Product name cannot be empty".into()));
    }

    if cost_price < 0 {
        return Err(sqlx::Error::Protocol(
            "Cost price cannot be negative".into(),
        ));
    }

    if selling_price < 0 {
        return Err(sqlx::Error::Protocol(
            "Selling price cannot be negative".into(),
        ));
    }

    if stock_quantity < 0 {
        return Err(sqlx::Error::Protocol(
            "Stock quantity cannot be negative".into(),
        ));
    }

    let product_id = Uuid::new_v4().to_string();
    let now = Utc::now();

    let mut transaction = pool.begin().await?;

    // ------------------------------------------------------------
    // Create product with ZERO stock.
    //
    // Initial stock will be recorded through inventory_movements.
    // ------------------------------------------------------------

    sqlx::query(
        r#"
        INSERT INTO products (
            id,
            name,
            sku,
            category,
            cost_price,
            selling_price,
            stock_quantity,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
        "#,
    )
    .bind(&product_id)
    .bind(name.trim())
    .bind(sku)
    .bind(category)
    .bind(cost_price)
    .bind(selling_price)
    .bind(now)
    .bind(now)
    .execute(&mut *transaction)
    .await?;

    // ------------------------------------------------------------
    // Record initial stock through inventory movement.
    //
    // The migration-003 trigger updates products.stock_quantity.
    // ------------------------------------------------------------

    if stock_quantity > 0 {
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
        .bind("ADJUSTMENT")
        .bind(stock_quantity)
        .bind("PRODUCT_CREATION")
        .bind(&product_id)
        .bind("Initial stock")
        .bind(now)
        .execute(&mut *transaction)
        .await?;
    }

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
    .bind(&product_id)
    .fetch_one(&mut *transaction)
    .await?;

    transaction.commit().await?;

    Ok(product)
}

pub async fn update_product(
    pool: &SqlitePool,
    id: &str,
    name: &str,
    sku: Option<&str>,
    category: Option<&str>,
    cost_price: i64,
    selling_price: i64,
) -> Result<Option<Product>, sqlx::Error> {
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        UPDATE products
        SET
            name = ?,
            sku = ?,
            category = ?,
            cost_price = ?,
            selling_price = ?,
            updated_at = ?
        WHERE id = ?
        "#,
    )
    .bind(name.trim())
    .bind(sku)
    .bind(category)
    .bind(cost_price)
    .bind(selling_price)
    .bind(now)
    .bind(id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Ok(None);
    }

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
    .bind(id)
    .fetch_one(pool)
    .await?;

    Ok(Some(product))
}

pub async fn list_products(
    pool: &SqlitePool,
) -> Result<Vec<Product>, sqlx::Error> {
    sqlx::query_as::<_, Product>(
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
    .fetch_all(pool)
    .await
}
