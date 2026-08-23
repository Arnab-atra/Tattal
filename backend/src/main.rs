mod api;
mod db;
mod models;
mod reports;
mod repositories;

use api::dashboard::AppState;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // --------------------------------------------------
    // DATABASE
    // --------------------------------------------------

    let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| {
        "sqlite:///home/arnab-patra/Desktop/sales-tracker/data/sales_tracker.db".to_string()
    });

    println!("Database: {}", database_url);

    let pool = db::create_pool(&database_url).await?;

    println!("Database ready.");

    // --------------------------------------------------
    // DATABASE MIGRATIONS
    // --------------------------------------------------

    sqlx::migrate!("../database/migrations").run(&pool).await?;

    println!("Database migrations applied.");

    // --------------------------------------------------
    // APPLICATION STATE
    // --------------------------------------------------

    let state = AppState { pool: pool.clone() };

    // --------------------------------------------------
    // API ROUTER
    // --------------------------------------------------

    let app = api::router(state);

    // --------------------------------------------------
    // SERVER
    // --------------------------------------------------

    let address = "127.0.0.1:3000";

    let listener = tokio::net::TcpListener::bind(address).await?;

    println!();
    println!("=================================");
    println!("          SALES TRACKER");
    println!("=================================");
    println!();
    println!("Server: http://{}", address);
    println!("Database: {}", database_url);
    println!();
    println!("Available endpoints:");
    println!("  GET  /api/health");
    println!("  GET  /api/dashboard");
    println!("  GET  /api/analytics");
    println!("  GET  /api/products");
    println!("  POST /api/products");
    println!("  POST /api/products/{{id}}/stock");
    println!("  GET  /api/products/{{id}}/inventory");
    println!("  GET  /api/customers");
    println!("  POST /api/customers");
    println!("  GET  /api/customers/{{id}}");
    println!("  PUT  /api/customers/{{id}}");
    println!("  GET  /api/sales");
    println!("  POST /api/sales");
    println!("  GET  /api/sales/{{id}}");
    println!("  GET  /api/expenses");
    println!("  POST /api/expenses");
    println!();
    println!("Press Ctrl+C to stop.");
    println!("=================================");

    axum::serve(listener, app).await?;

    Ok(())
}
