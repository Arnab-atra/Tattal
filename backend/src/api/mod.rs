// ============================================================
// API ROUTER MODULE
//
// Defines all HTTP API routes and shared middleware.
// ============================================================

pub mod analytics;
pub mod customers;
pub mod dashboard;
pub mod expenses;
pub mod health;
pub mod products;
pub mod sales;

use axum::{
    Router,
    http::Method,
    routing::{get, post},
};
use tower_http::cors::{AllowOrigin, CorsLayer};
use tower_http::limit::RequestBodyLimitLayer;

use dashboard::AppState;

/// Maximum allowed request body size: 10 MiB.
const MAX_BODY_SIZE: usize = 10 * 1024 * 1024;

/// Builds the main API router.
pub fn router(state: AppState) -> Router {
    // --------------------------------------------------
    // CORS
    // --------------------------------------------------

    let frontend_origin =
        std::env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:5173".to_string());

    let allow_origin = frontend_origin
        .parse()
        .expect("FRONTEND_URL must be a valid origin");

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::exact(allow_origin))
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers(tower_http::cors::Any);

    // --------------------------------------------------
    // ROUTES
    // --------------------------------------------------

    Router::new()
        // Health
        .route("/api/health", get(health::health))
        // Dashboard & Analytics
        .route("/api/dashboard", get(dashboard::dashboard))
        .route("/api/analytics", get(analytics::analytics))
        // Products
        .route(
            "/api/products",
            get(products::list_products).post(products::create_product),
        )
        .route(
            "/api/products/{id}",
            axum::routing::put(products::update_product),
        )
        .route("/api/products/{id}/stock", post(products::add_stock))
        .route(
            "/api/products/{id}/inventory",
            get(products::list_inventory_movements),
        )
        // Customers
        .route(
            "/api/customers",
            get(customers::list_customers).post(customers::create_customer),
        )
        .route(
            "/api/customers/{id}",
            get(customers::get_customer).put(customers::update_customer),
        )
        // Sales
        .route(
            "/api/sales",
            get(sales::list_sales).post(sales::create_sale),
        )
        .route("/api/sales/{id}", get(sales::get_sale))
        // Expenses
        .route(
            "/api/expenses",
            get(expenses::list_expenses).post(expenses::create_expense),
        )
        // Middleware
        .layer(cors)
        .layer(RequestBodyLimitLayer::new(MAX_BODY_SIZE))
        .with_state(state)
}
