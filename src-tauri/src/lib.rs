use std::path::PathBuf;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_data_dir: PathBuf = app.path().app_data_dir()?;

            std::fs::create_dir_all(&app_data_dir)?;

            let database_path = app_data_dir.join("sales_tracker.db");

            println!("Tattal data directory: {}", app_data_dir.display());
            println!("Tattal database: {}", database_path.display());

            tauri::async_runtime::spawn(async move {
                if let Err(error) = backend::run_server_with_pool(
                    match backend::db::create_pool(&database_path).await {
                        Ok(pool) => pool,
                        Err(error) => {
                            eprintln!("Failed to create database pool: {}", error);
                            return;
                        }
                    },
                )
                .await
                {
                    eprintln!("Backend server failed: {}", error);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Tattal application");
}
