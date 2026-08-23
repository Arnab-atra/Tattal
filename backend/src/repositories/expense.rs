use chrono::Utc;
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::expense::Expense;

pub async fn create_expense(
    pool: &SqlitePool,
    category: &str,
    description: Option<&str>,
    amount: i64,
    payment_method: Option<&str>,
    notes: Option<&str>,
) -> Result<Expense, sqlx::Error> {
    if amount <= 0 {
        return Err(sqlx::Error::Protocol(
            "Expense amount must be greater than zero".into(),
        ));
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now();

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
    .bind(now)
    .bind(category)
    .bind(description)
    .bind(amount)
    .bind(payment_method)
    .bind(notes)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    let expense = sqlx::query_as::<_, Expense>(
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
        WHERE id = ?
        "#,
    )
    .bind(&id)
    .fetch_one(pool)
    .await?;

    Ok(expense)
}
