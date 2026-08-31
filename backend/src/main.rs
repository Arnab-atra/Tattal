// ============================================================
// MAIN APPLICATION ENTRY POINT
//
// Initializes the Tattal backend, connects to SQLite,
// runs database migrations, builds the API router,
// and starts the HTTP server.
// ============================================================

mod api;
mod db;
mod models;
mod reports;
mod repositories;

use api::dashboard::AppState;
use std::env;
use std::path::PathBuf;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // ------------------------------------------------------------
    // 1. Initialize logging
    // ------------------------------------------------------------

    tracing_subscriber::fmt::init();

    tracing::info!("Starting Tattal Sales Tracker...");

    // ------------------------------------------------------------
    // 2. Determine database path
    // ------------------------------------------------------------

    let database_path = env::var_os("DATABASE_PATH")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .parent()
                .expect("Backend directory should have a project root")
                .join("data")
                .join("sales_tracker.db")
        });

    tracing::info!("Database path: {}", database_path.display());

    // ------------------------------------------------------------
    // 3. Create database connection pool
    // ------------------------------------------------------------

    let pool = db::create_pool(&database_path).await?;

    tracing::info!("Database connection pool ready.");

    // ------------------------------------------------------------
    // 4. Run database migrations
    // ------------------------------------------------------------

    sqlx::migrate!("../database/migrations").run(&pool).await?;

    tracing::info!("Database migrations applied.");

    // ------------------------------------------------------------
    // 5. Build application state and router
    // ------------------------------------------------------------

    let state = AppState { pool };

    let app = api::router(state);

    // ------------------------------------------------------------
    // 6. Configure HTTP server
    // ------------------------------------------------------------

    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());

    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_string());

    let address = format!("{host}:{port}");

    let listener = tokio::net::TcpListener::bind(&address).await?;

    // ------------------------------------------------------------
    // 7. Startup information
    // ------------------------------------------------------------

    println!();
    println!("=================================");
    println!("          TATTAL BACKEND");
    println!("=================================");
    println!();
    println!("Server:   http://{address}");
    println!("Database: {}", database_path.display());
    println!();

    println!("Available endpoints:");
    println!("  GET  /api/health");
    println!("  GET  /api/dashboard");
    println!("  GET  /api/analytics");
    println!("  GET  /api/products");
    println!("  POST /api/products");
    println!("  PUT  /api/products/{{id}}");
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
    println!();

    // ------------------------------------------------------------
    // 8. Start HTTP server
    // ------------------------------------------------------------

    axum::serve(listener, app).await?;

    Ok(())
}
