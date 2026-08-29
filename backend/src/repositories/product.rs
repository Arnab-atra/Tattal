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
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();

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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&id)
    .bind(name)
    .bind(sku)
    .bind(category)
    .bind(cost_price)
    .bind(selling_price)
    .bind(stock_quantity)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

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
    .fetch_one(pool)
    .await?;

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
    .bind(name)
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
