import { useEffect, useState } from "react";
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
  Settings,
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

import "./App.css";

type Theme = "light" | "dark";

const navigation = [
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

function getInitialTheme(): Theme {
  const saved = localStorage.getItem("tattal-theme");

  if (saved === "dark" || saved === "light") {
    return saved;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("tattal-theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <div className="app-shell">
      {mobileSidebarOpen && (
        <button
          className="sidebar-backdrop"
          onClick={closeMobileSidebar}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={[
          "sidebar",
          sidebarCollapsed ? "sidebar-collapsed" : "",
          mobileSidebarOpen ? "sidebar-mobile-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
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

        <div className="sidebar-scroll">
          <nav className="sidebar-nav">
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

                      {!sidebarCollapsed && (
                        <span>{item.label}</span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            ))}

            <div className="nav-section nav-section-settings">
              {!sidebarCollapsed && (
                <div className="nav-section-title">System</div>
              )}

              <button
                className="nav-link nav-link-button"
                title={sidebarCollapsed ? "Settings" : undefined}
                type="button"
              >
                <Settings size={19} strokeWidth={2} />
                {!sidebarCollapsed && <span>Settings</span>}
              </button>
            </div>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <button
            className="collapse-button"
            onClick={() => setSidebarCollapsed((value) => !value)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu-button"
              onClick={() => setMobileSidebarOpen(true)}
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
              {theme === "dark" ? (
                <Sun size={19} />
              ) : (
                <Moon size={19} />
              )}
            </button>

            <div className="topbar-divider" />

            <div className="business-status">
              <span className="status-dot" />
              <span>Local</span>
            </div>
          </div>
        </header>

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
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
