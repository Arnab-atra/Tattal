use chrono::Utc;
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::customer::Customer;

pub async fn create_customer(
    pool: &SqlitePool,
    name: &str,
    phone: Option<&str>,
    email: Option<&str>,
    notes: Option<&str>,
) -> Result<Customer, sqlx::Error> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();

    sqlx::query(
        r#"
        INSERT INTO customers (
            id,
            name,
            phone,
            email,
            notes,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&id)
    .bind(name)
    .bind(phone)
    .bind(email)
    .bind(notes)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    let customer = sqlx::query_as::<_, Customer>(
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
    .bind(&id)
    .fetch_one(pool)
    .await?;

    Ok(customer)
}

pub async fn update_customer(
    pool: &SqlitePool,
    id: &str,
    name: &str,
    phone: Option<&str>,
    email: Option<&str>,
    notes: Option<&str>,
) -> Result<Option<Customer>, sqlx::Error> {
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        UPDATE customers
        SET
            name = ?,
            phone = ?,
            email = ?,
            notes = ?,
            updated_at = ?
        WHERE id = ?
        "#,
    )
    .bind(name)
    .bind(phone)
    .bind(email)
    .bind(notes)
    .bind(now)
    .bind(id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Ok(None);
    }

    let customer = sqlx::query_as::<_, Customer>(
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
    .bind(id)
    .fetch_one(pool)
    .await?;

    Ok(Some(customer))
}
