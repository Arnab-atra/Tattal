// ============================================================
// Settings.tsx
//
// A settings page that provides:
// - Theme toggle (Light/Dark mode)
// - Sidebar collapse preference
// - Application information
// - Reset preferences option
// ============================================================

import { useCallback, useState } from "react";
import {
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CircleDollarSign,
} from "lucide-react";
import "./Settings.css";

// ============================================================
// TYPES
// ============================================================

type Theme = "light" | "dark";

// ============================================================
// PROPS
// ============================================================

interface SettingsProps {
  theme: Theme;
  sidebarCollapsed: boolean;
  onThemeToggle: () => void;
  onSidebarToggle: () => void;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

function Settings({
  theme,
  sidebarCollapsed,
  onThemeToggle,
  onSidebarToggle,
}: SettingsProps) {
  // ==========================================================
  // STATE
  // ==========================================================

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // ==========================================================
  // HANDLERS
  // ==========================================================

  /**
   * Resets all preferences to default values
   */
  const handleResetPreferences = useCallback(() => {
    // Reset theme to light
    if (theme !== "light") {
      onThemeToggle();
    }

    // Reset sidebar to expanded
    if (sidebarCollapsed) {
      onSidebarToggle();
    }

    // Clear any saved preferences
    localStorage.removeItem("tattal-theme");
    localStorage.removeItem("tattal-sidebar-collapsed");

    setShowResetConfirm(false);
    setSuccessMessage("Preferences reset to default values.");

    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  }, [theme, sidebarCollapsed, onThemeToggle, onSidebarToggle]);

  /**
   * Toggles the reset confirmation dialog
   */
  const toggleResetConfirm = useCallback(() => {
    setShowResetConfirm((prev) => !prev);
    setSuccessMessage("");
  }, []);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="settings-page" role="main" aria-label="Settings">
      {/* ==========================================================
          HEADER
          ========================================================== */}
      <header className="page-header" aria-label="Settings header">
        <div>
          <h2>Settings</h2>
          <p>Manage your application preferences and settings.</p>
        </div>
      </header>

      {/* ==========================================================
          SUCCESS MESSAGE
          ========================================================== */}
      {successMessage && (
        <div className="success" role="status">
          {successMessage}
        </div>
      )}

      {/* ==========================================================
          APPEARANCE SETTINGS
          ========================================================== */}
      <section className="card" aria-label="Appearance settings">
        <div className="card-header">
          <div>
            <h3>Appearance</h3>
            <p>Customize how the application looks.</p>
          </div>
        </div>

        <div className="settings-list">
          {/* Theme Toggle */}
          <div className="settings-item">
            <div className="settings-item-info">
              <div className="settings-item-icon">
                {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
              </div>
              <div>
                <strong>Theme</strong>
                <span>
                  {theme === "dark" ? "Dark mode" : "Light mode"} —
                  {theme === "dark"
                    ? " Dark theme reduces eye strain in low light."
                    : " Light theme for bright environments."}
                </span>
              </div>
            </div>

            <button
              className="settings-toggle"
              onClick={onThemeToggle}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              <span
                className={`toggle-track ${theme === "dark" ? "active" : ""}`}
              >
                <span className="toggle-thumb" />
              </span>
              <span className="toggle-label">
                {theme === "dark" ? "Dark" : "Light"}
              </span>
            </button>
          </div>

          {/* Sidebar Toggle */}
          <div className="settings-item">
            <div className="settings-item-info">
              <div className="settings-item-icon">
                {sidebarCollapsed ? (
                  <ChevronRight size={18} />
                ) : (
                  <ChevronLeft size={18} />
                )}
              </div>
              <div>
                <strong>Sidebar</strong>
                <span>
                  {sidebarCollapsed
                    ? "Sidebar is collapsed — only icons are visible."
                    : "Sidebar is expanded — labels and icons are visible."}
                </span>
              </div>
            </div>

            <button
              className="settings-toggle"
              onClick={onSidebarToggle}
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
            >
              <span
                className={`toggle-track ${sidebarCollapsed ? "active" : ""}`}
              >
                <span className="toggle-thumb" />
              </span>
              <span className="toggle-label">
                {sidebarCollapsed ? "Collapsed" : "Expanded"}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ==========================================================
          PREFERENCES
          ========================================================== */}
      <section className="card" aria-label="Preferences">
        <div className="card-header">
          <div>
            <h3>Preferences</h3>
            <p>Reset or manage your saved preferences.</p>
          </div>
        </div>

        <div className="settings-list">
          {/* Reset Preferences */}
          <div className="settings-item">
            <div className="settings-item-info">
              <div className="settings-item-icon danger">
                <RefreshCw size={18} />
              </div>
              <div>
                <strong>Reset Preferences</strong>
                <span>
                  Reset all settings to their default values.
                  {showResetConfirm && (
                    <span className="reset-warning">
                      {" "}
                      Are you sure? This action cannot be undone.
                    </span>
                  )}
                </span>
              </div>
            </div>

            {!showResetConfirm ? (
              <button
                className="settings-button danger"
                onClick={toggleResetConfirm}
              >
                Reset
              </button>
            ) : (
              <div className="settings-confirm-actions">
                <button
                  className="settings-button secondary"
                  onClick={toggleResetConfirm}
                >
                  Cancel
                </button>
                <button
                  className="settings-button danger confirm"
                  onClick={handleResetPreferences}
                >
                  Confirm Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ==========================================================
          ABOUT
          ========================================================== */}
      <section className="card" aria-label="About">
        <div className="card-header">
          <div>
            <h3>About</h3>
            <p>Application information.</p>
          </div>
        </div>

        <div className="settings-list">
          <div className="settings-item about-item">
            <div className="about-content">
              <div className="about-icon">
                <CircleDollarSign size={32} strokeWidth={1.5} />
              </div>
              <div>
                <strong>Tattal Sales Management</strong>
                <span>Version 1.0.0</span>
                <span className="about-description">
                  A comprehensive sales management system for local businesses.
                  Manage sales, products, inventory, customers, expenses, and
                  more.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Settings;
