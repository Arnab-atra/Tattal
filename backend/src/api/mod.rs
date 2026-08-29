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
use tower_http::cors::{Any, CorsLayer};

use dashboard::AppState;

pub fn router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers(Any);

    Router::new()
        .route("/api/health", get(health::health))
        .route("/api/dashboard", get(dashboard::dashboard))
        .route("/api/analytics", get(analytics::analytics))
        .route(
            "/api/products",
            get(products::list_products).post(products::create_product),
        )
        .route("/api/products/{id}/stock", post(products::add_stock))
        .route(
            "/api/products/{id}/inventory",
            get(products::list_inventory_movements),
        )
        .route(
            "/api/products/{id}",
            axum::routing::put(products::update_product),
        )
        .route(
            "/api/customers",
            get(customers::list_customers).post(customers::create_customer),
        )
        .route(
            "/api/customers/{id}",
            get(customers::get_customer).put(customers::update_customer),
        )
        .route(
            "/api/sales",
            get(sales::list_sales).post(sales::create_sale),
        )
        .route("/api/sales/{id}", get(sales::get_sale))
        .route(
            "/api/expenses",
            get(expenses::list_expenses).post(expenses::create_expense),
        )
        .layer(cors)
        .with_state(state)
}
