use sqlx::{SqlitePool, sqlite::SqlitePoolOptions};
use std::path::Path;

pub async fn create_pool(database_url: &str) -> Result<SqlitePool, sqlx::Error> {
    if let Some(path) = database_url.strip_prefix("sqlite://") {
        let database_path = Path::new(path);

        if let Some(parent) = database_path.parent() {
            std::fs::create_dir_all(parent).map_err(sqlx::Error::Io)?;
        }
    }

    SqlitePoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
}
