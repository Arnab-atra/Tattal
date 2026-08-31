// ============================================================
// DATABASE CONNECTION MODULE
// ============================================================
//
// This module is responsible for creating and managing the
// SQLite connection pool used by Tattal.
//
// Design goals:
// - Cross-platform filesystem path support
// - SQLite database creation when missing
// - Automatic creation of the database directory
// - Foreign-key enforcement on every SQLite connection
// - Configurable connection-pool size
// - Simple database connectivity health checks
//
// IMPORTANT:
// The application should provide the database filesystem path.
// This module intentionally does NOT construct operating-system-
// specific paths or hard-code a user's home directory.
//
// For the Tauri desktop application, the database path is obtained
// from Tauri's `app_data_dir()`. This allows Windows, Linux, and
// macOS to use their appropriate application-data locations.
//
// ============================================================

use sqlx::{
    Executor, SqlitePool,
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
};
use std::path::Path;
use tracing::info;

// ============================================================
// CONSTANTS
// ============================================================

/// Default maximum number of SQLite connections in the pool.
///
/// This value is used when `DATABASE_POOL_SIZE` is not set or
/// contains an invalid/non-positive value.
const DEFAULT_POOL_SIZE: u32 = 10;

// ============================================================
// PUBLIC FUNCTIONS
// ============================================================

/// Creates and configures a SQLite connection pool.
///
/// # Arguments
///
/// * `database_path` - Filesystem path to the SQLite database file.
///   The path may be absolute or relative.
///
/// # Cross-platform behavior
///
/// The database path is passed directly to SQLx through
/// [`SqliteConnectOptions::filename`]. This avoids manually
/// constructing SQLite connection URLs and allows the operating
/// system's native path format to be used.
///
/// Examples:
///
/// ```text
/// Linux:
/// /home/user/.local/share/tattal/sales_tracker.db
///
/// Windows:
/// C:\Users\User\AppData\Local\Tattal\sales_tracker.db
///
/// macOS:
/// /Users/User/Library/Application Support/Tattal/sales_tracker.db
///
/// Relative development path:
/// ./data/sales_tracker.db
/// ```
///
/// # Environment variables
///
/// `DATABASE_POOL_SIZE`
///
/// Controls the maximum number of connections in the pool.
///
/// Examples:
///
/// ```text
/// DATABASE_POOL_SIZE=5
/// DATABASE_POOL_SIZE=20
/// ```
///
/// If the variable is missing, invalid, or set to `0`, the default
/// value of [`DEFAULT_POOL_SIZE`] is used.
///
/// # Database initialization
///
/// This function:
///
/// 1. Creates the parent directory if it does not exist.
/// 2. Configures SQLx to create the SQLite database file if missing.
/// 3. Creates a connection pool.
/// 4. Enables SQLite foreign-key enforcement whenever SQLx creates
///    a new database connection.
///
/// SQLite's `foreign_keys` setting is connection-specific, so it
/// must be enabled for every connection created by the pool.
///
/// # Errors
///
/// Returns [`sqlx::Error`] if:
///
/// * The database directory cannot be created.
/// * A SQLite connection cannot be established.
/// * The database file cannot be created or opened.
/// * SQLite rejects the connection configuration.
pub async fn create_pool(database_path: &Path) -> Result<SqlitePool, sqlx::Error> {
    // ------------------------------------------------------------
    // 1. Ensure the database directory exists
    // ------------------------------------------------------------
    //
    // `parent()` returns the directory containing the database file.
    //
    // `create_dir_all()` is safe for nested directories and works
    // with native filesystem paths on supported desktop platforms.

    if let Some(parent) = database_path.parent()
        && !parent.exists()
    {
        std::fs::create_dir_all(parent).map_err(|error| {
            sqlx::Error::Io(std::io::Error::other(format!(
                "Failed to create database directory '{}': {}",
                parent.display(),
                error
            )))
        })?;

        info!("Created database directory: {}", parent.display());
    }

    // ------------------------------------------------------------
    // 2. Determine the connection-pool size
    // ------------------------------------------------------------

    let pool_size = std::env::var("DATABASE_POOL_SIZE")
        .ok()
        .and_then(|value| value.parse::<u32>().ok())
        .filter(|size| *size > 0)
        .unwrap_or(DEFAULT_POOL_SIZE);

    info!("Using database pool size: {}", pool_size);

    // ------------------------------------------------------------
    // 3. Configure SQLite
    // ------------------------------------------------------------
    //
    // Passing the filesystem path directly to SQLx is preferable
    // to manually constructing strings such as:
    //
    //     sqlite:///home/user/database.db
    //
    // or:
    //
    //     sqlite://C:\Users\User\database.db
    //
    // `SqliteConnectOptions::filename()` handles the native path
    // representation provided by the caller.

    let options = SqliteConnectOptions::new()
        .filename(database_path)
        .create_if_missing(true);

    info!("Connecting to SQLite database: {}", database_path.display());

    // ------------------------------------------------------------
    // 4. Create the connection pool
    // ------------------------------------------------------------
    //
    // `after_connect` runs when SQLx establishes a new connection.
    //
    // SQLite's foreign-key enforcement is connection-local, so the
    // PRAGMA must be applied to every connection created by the pool.
    //
    // Using `after_connect` avoids executing the PRAGMA every time
    // an existing connection is acquired from the pool.

    SqlitePoolOptions::new()
        .max_connections(pool_size)
        .after_connect(|conn, _meta| {
            Box::pin(async move {
                // Enable SQLite foreign-key enforcement.
                //
                // Without this setting, SQLite does not enforce
                // foreign-key constraints by default.
                conn.execute("PRAGMA foreign_keys = ON;").await?;

                Ok(())
            })
        })
        .connect_with(options)
        .await
}

/// Checks whether the database connection pool is responsive.
///
/// The function attempts to acquire a connection from the pool.
/// It does not execute a database query; successfully acquiring
/// a connection is sufficient for this lightweight health check.
///
/// # Returns
///
/// * `true` - A connection was successfully acquired.
/// * `false` - The pool could not provide a connection.
///
/// # Usage
///
/// This function is intended for the `/api/health` endpoint and
/// other lightweight application health checks.
pub async fn check_connection(pool: &SqlitePool) -> bool {
    pool.acquire().await.is_ok()
}

// ============================================================
// TESTS
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    /// Verifies that `create_pool()` creates the SQLite database
    /// file when it does not already exist.
    #[tokio::test]
    async fn test_create_pool_creates_database() {
        let temp_dir = tempdir().expect("Failed to create temporary directory");

        let database_path = temp_dir.path().join("test.db");

        let pool = create_pool(&database_path)
            .await
            .expect("Failed to create SQLite pool");

        assert!(
            database_path.exists(),
            "SQLite database file was not created"
        );

        assert!(
            check_connection(&pool).await,
            "Database connection check failed"
        );
    }

    /// Verifies that `create_pool()` creates missing nested
    /// directories before creating the SQLite database.
    #[tokio::test]
    async fn test_create_pool_creates_nested_directories() {
        let temp_dir = tempdir().expect("Failed to create temporary directory");

        let database_path = temp_dir.path().join("nested").join("deep").join("test.db");

        let pool = create_pool(&database_path)
            .await
            .expect("Failed to create SQLite pool");

        assert!(
            database_path.exists(),
            "SQLite database file was not created"
        );

        assert!(
            check_connection(&pool).await,
            "Database connection check failed"
        );
    }

    /// Verifies that SQLite foreign-key enforcement is enabled
    /// for connections created by the pool.
    #[tokio::test]
    async fn test_foreign_keys_are_enabled() {
        let temp_dir = tempdir().expect("Failed to create temporary directory");

        let database_path = temp_dir.path().join("test.db");

        let pool = create_pool(&database_path)
            .await
            .expect("Failed to create SQLite pool");

        let foreign_keys: i32 = sqlx::query_scalar("PRAGMA foreign_keys;")
            .fetch_one(&pool)
            .await
            .expect("Failed to query foreign_keys pragma");

        assert_eq!(
            foreign_keys, 1,
            "SQLite foreign-key enforcement is not enabled"
        );
    }
}
