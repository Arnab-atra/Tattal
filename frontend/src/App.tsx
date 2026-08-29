// ============================================================
// App.tsx
//
// The main application component that provides:
// - Theme management (light/dark mode)
// - Sidebar navigation with collapse support
// - Mobile-responsive sidebar
// - Route configuration for all pages
// - Topbar with theme toggle and status indicator
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileBarChart,
  LayoutDashboard,
  Menu,
  Moon,
  Package,
  Settings as SettingsIcon,
  ShoppingCart,
  Sun,
  Users,
  Wallet,
  X,
} from "lucide-react";

import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Sales from "./pages/Sales";
import Inventory from "./pages/Inventory";
import Customers from "./pages/Customers";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings"; // Import the Settings component

import "./App.css";

// ============================================================
// TYPES
// ============================================================

type Theme = "light" | "dark";

/**
 * Navigation item configuration
 */
type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  end?: boolean;
};

/**
 * Navigation section configuration
 */
type NavSection = {
  label: string;
  items: NavItem[];
};

// ============================================================
// CONSTANTS
// ============================================================

/**
 * Navigation structure - defines all routes and their display
 */
const navigation: NavSection[] = [
  {
    label: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/reports", label: "Reports", icon: FileBarChart },
    ],
  },
  {
    label: "Business",
    items: [
      { to: "/sales", label: "Sales", icon: ShoppingCart },
      { to: "/products", label: "Products", icon: Package },
      { to: "/inventory", label: "Inventory", icon: Boxes },
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/expenses", label: "Expenses", icon: Wallet },
    ],
  },
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Gets the initial theme based on:
 * 1. Saved preference in localStorage
 * 2. System preference (prefers-color-scheme)
 * 3. Default to light mode
 */
const getInitialTheme = (): Theme => {
  const saved = localStorage.getItem("tattal-theme");

  if (saved === "dark" || saved === "light") {
    return saved;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

/**
 * Gets the initial sidebar state from localStorage
 */
const getInitialSidebarState = (): boolean => {
  const saved = localStorage.getItem("tattal-sidebar-collapsed");
  return saved === "true";
};

// ============================================================
// MAIN COMPONENT
// ============================================================

function App() {
  // ==========================================================
  // STATE
  // ==========================================================

  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    getInitialSidebarState,
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // ==========================================================
  // EFFECTS
  // ==========================================================

  /**
   * Updates the theme whenever it changes
   * Saves the preference to localStorage
   */
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("tattal-theme", theme);
  }, [theme]);

  /**
   * Saves sidebar state to localStorage when it changes
   */
  useEffect(() => {
    localStorage.setItem("tattal-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  /**
   * Auto-closes mobile sidebar on window resize to desktop
   */
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ==========================================================
  // HANDLERS
  // ==========================================================

  /**
   * Toggles between light and dark themes
   */
  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  /**
   * Toggles sidebar collapse state
   */
  const toggleSidebarCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  /**
   * Closes the mobile sidebar
   */
  const closeMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  /**
   * Opens the mobile sidebar
   */
  const openMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(true);
  }, []);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="app-shell">
      {/* ==========================================================
          MOBILE SIDEBAR BACKDROP
          ========================================================== */}
      {mobileSidebarOpen && (
        <button
          className="sidebar-backdrop"
          onClick={closeMobileSidebar}
          aria-label="Close navigation"
        />
      )}

      {/* ==========================================================
          SIDEBAR
          ========================================================== */}
      <aside
        className={[
          "sidebar",
          sidebarCollapsed ? "sidebar-collapsed" : "",
          mobileSidebarOpen ? "sidebar-mobile-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-mark">
              <CircleDollarSign size={22} strokeWidth={2.3} />
            </div>

            {!sidebarCollapsed && (
              <div className="brand-copy">
                <strong>Tattal</strong>
                <span>Sales Management</span>
              </div>
            )}
          </div>

          <button
            className="icon-button sidebar-close-mobile"
            onClick={closeMobileSidebar}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <div className="sidebar-scroll">
          <nav className="sidebar-nav" aria-label="Main navigation">
            {navigation.map((section) => (
              <div className="nav-section" key={section.label}>
                {!sidebarCollapsed && (
                  <div className="nav-section-title">{section.label}</div>
                )}

                {section.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={closeMobileSidebar}
                      className={({ isActive }) =>
                        `nav-link ${isActive ? "active" : ""}`
                      }
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <Icon size={19} strokeWidth={2} />

                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            ))}

            {/* Settings Section - Now a real link */}
            <div className="nav-section nav-section-settings">
              {!sidebarCollapsed && (
                <div className="nav-section-title">System</div>
              )}

              <NavLink
                to="/settings"
                onClick={closeMobileSidebar}
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
                title={sidebarCollapsed ? "Settings" : undefined}
              >
                <SettingsIcon size={19} strokeWidth={2} />
                {!sidebarCollapsed && <span>Settings</span>}
              </NavLink>
            </div>
          </nav>
        </div>

        {/* Sidebar Bottom */}
        <div className="sidebar-bottom">
          <button
            className="collapse-button"
            onClick={toggleSidebarCollapse}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            {sidebarCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}

            {!sidebarCollapsed && <span>Collapse sidebar</span>}
          </button>

          {!sidebarCollapsed && (
            <div className="sidebar-version">
              <span>Tattal</span>
              <small>Local business system</small>
            </div>
          )}
        </div>
      </aside>

      {/* ==========================================================
          MAIN AREA
          ========================================================== */}
      <div className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu-button"
              onClick={openMobileSidebar}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>

            <div className="page-heading">
              <span className="topbar-label">BUSINESS MANAGEMENT</span>
              <h1>Sales Tracker</h1>
            </div>
          </div>

          <div className="topbar-actions">
            <button
              className="icon-button"
              onClick={toggleTheme}
              title={
                theme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>

            <div className="topbar-divider" />

            <div className="business-status">
              <span className="status-dot" />
              <span>Local</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route
              path="/settings"
              element={
                <Settings
                  theme={theme}
                  sidebarCollapsed={sidebarCollapsed}
                  onThemeToggle={toggleTheme}
                  onSidebarToggle={toggleSidebarCollapse}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
