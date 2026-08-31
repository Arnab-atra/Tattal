// ============================================================
// HEALTH CHECK ENDPOINT
//
// Provides a simple endpoint to verify that the application
// and its database connection are working properly.
//
// This endpoint is used by:
// - Monitoring tools (e.g., Prometheus, Uptime Kuma)
// - Container orchestration (health probes)
// - Load balancers (to determine if the instance is alive)
// ============================================================

use axum::{Json, extract::State, http::StatusCode};
use serde_json::{Value, json};

use crate::api::dashboard::AppState;
use crate::db::check_connection;

// ============================================================
// ENDPOINT HANDLER
// ============================================================

/// Handler for `GET /api/health`.
///
/// This function checks database connectivity and returns a JSON response
/// with the overall service status and the database status.
///
/// # Returns
///
/// | Status Code | Response Body | Meaning |
/// |-------------|---------------|---------|
/// | `200 OK` | `{ "status": "ok", "database": "ok" }` | Everything is healthy. |
/// | `503 Service Unavailable` | `{ "status": "degraded", "database": "error" }` | The application is running, but the database is unreachable. |
///
/// # How it works
///
/// 1. Attempts to acquire a database connection from the pool using `check_connection`.
/// 2. If successful, responds with `200 OK`.
/// 3. If the connection fails, responds with `503 Service Unavailable`.
///
/// # Dependencies
///
/// - `AppState` must be `Clone` (defined in `api/dashboard.rs`).
/// - `check_connection` must be exported from `db/mod.rs`.
///
/// # Example response (healthy)
///
/// ```json
/// {
///   "status": "ok",
///   "database": "ok"
/// }
/// ```
///
/// # Example response (degraded)
///
/// ```json
/// {
///   "status": "degraded",
///   "database": "error"
/// }
/// ```
pub async fn health(
    // Extract the application state from the request.
    // This gives us access to the database connection pool.
    State(state): State<AppState>,
) -> (StatusCode, Json<Value>) {
    // Attempt to acquire a database connection.
    // `check_connection` returns `true` if successful, `false` otherwise.
    let database_ok = check_connection(&state.pool).await;

    if database_ok {
        // Everything is healthy: respond with 200 OK.
        (
            StatusCode::OK,
            Json(json!({
                "status": "ok",
                "database": "ok"
            })),
        )
    } else {
        // The application is running but the database is down:
        // respond with 503 Service Unavailable.
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({
                "status": "degraded",
                "database": "error"
            })),
        )
    }
}
