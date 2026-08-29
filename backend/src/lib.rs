pub mod api;
pub mod db;
pub mod models;
pub mod reports;
pub mod repositories;

use api::dashboard::AppState;
use sqlx::SqlitePool;
use tokio::net::TcpListener;

pub async fn run_server_with_pool(
    pool: SqlitePool,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    println!("Database ready.");

    sqlx::migrate!("../database/migrations").run(&pool).await?;

    println!("Database migrations applied.");

    let state = AppState { pool };

    let app = api::router(state);

    let address = "127.0.0.1:3000";

    let listener = TcpListener::bind(address).await?;

    println!("Tattal backend running at http://{}", address);

    axum::serve(listener, app).await?;

    Ok(())
}
