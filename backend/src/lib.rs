pub mod api;
pub mod db;
pub mod models;
pub mod reports;
pub mod repositories;

use api::dashboard::AppState;
use std::env;
use tokio::net::TcpListener;

pub async fn run_server() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| {
        "sqlite:///home/arnab-patra/Desktop/sales-tracker/data/sales_tracker.db".to_string()
    });

    run_server_with_database(&database_url).await
}

pub async fn run_server_with_database(
    database_url: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    println!("Database: {}", database_url);

    let pool = db::create_pool(database_url).await?;

    println!("Database ready.");

    sqlx::migrate!("../database/migrations").run(&pool).await?;

    println!("Database migrations applied.");

    let state = AppState { pool: pool.clone() };

    let app = api::router(state);

    let address = "127.0.0.1:3000";

    let listener = TcpListener::bind(address).await?;

    println!("Sales Tracker backend running at http://{}", address);

    axum::serve(listener, app).await?;

    Ok(())
}
