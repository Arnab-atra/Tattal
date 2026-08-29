// ============================================================
// Analytics.tsx
// 
// A comprehensive business analytics page that provides:
// - Financial summary metrics (revenue, COGS, profits)
// - Key performance indicators (sales count, units sold, margins)
// - Daily performance visualization with progress bars
// - Monthly historical performance table
// - Top products by revenue ranking
// - Inventory overview with stock valuation
// 
// The page uses a single API endpoint to fetch all data
// and provides a refresh mechanism for real-time updates.
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import "./Analytics.css";

// ============================================================
// TYPES
// ============================================================

/**
 * Core sales metrics for the selected period
 */
type SalesMetrics = {
  total_sales: number;
  total_units_sold: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
  average_sale_value: number;
};

/**
 * Profit margin percentages
 */
type Margins = {
  gross_margin: number | null;
  net_margin: number | null;
};

/**
 * Daily performance trend data
 */
type DailyTrend = {
  date: string;
  revenue: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
};

/**
 * Monthly trend data for historical analysis
 */
type MonthlyTrend = {
  year: number;
  month: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
};

/**
 * Top selling products by revenue
 */
type TopProduct = {
  product_id: string;
  product_name: string;
  units_sold: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
};

/**
 * Current inventory snapshot
 */
type Inventory = {
  products: number;
  units_in_stock: number;
  stock_cost_value: number;
  potential_sales_value: number;
  potential_gross_profit: number;
};

/**
 * Complete analytics data response from API
 */
type AnalyticsData = {
  period: {
    year: number;
    month: number;
  };
  sales_metrics: SalesMetrics;
  margins: Margins;
  daily_trend: DailyTrend[];
  monthly_trend: MonthlyTrend[];
  top_products: TopProduct[];
  inventory: Inventory;
};

// ============================================================
// CONSTANTS
// ============================================================

// Use environment variable for API URL with fallback
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3000";

// ============================================================
// UTILITY FUNCTIONS (will be moved to shared utils later)
// ============================================================

/**
 * Formats a monetary value in Indian Rupees (₹)
 * @param amount - Value in paise (1/100 of a rupee)
 * @returns Formatted currency string (e.g., "₹1,234.56")
 */
const formatMoney = (amount: number): string => {
  return `₹${(amount / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Formats a percentage value
 * @param value - Percentage as a decimal (e.g., 0.4567 for 45.67%)
 * @returns Formatted percentage string (e.g., "45.67%") or "N/A" for null
 */
const formatPercent = (value: number | null): string => {
  if (value === null) {
    return "N/A";
  }
  return `${value.toFixed(2)}%`;
};

/**
 * Formats a date string to a short format
 * @param date - ISO date string (YYYY-MM-DD)
 * @returns Formatted date (e.g., "29 Aug")
 */
const formatDate = (date: string): string => {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

/**
 * Formats a month/year combination to a readable format
 * @param year - Four-digit year
 * @param month - Month number (1-12)
 * @returns Formatted month string (e.g., "August 2026")
 */
const formatMonth = (year: number, month: number): string => {
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

// ============================================================
// MAIN COMPONENT
// ============================================================

function Analytics() {
  // ==========================================================
  // STATE
  // ==========================================================

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================================
  // DATA FETCHING
  // ==========================================================

  /**
   * Fetches analytics data from the API
   * Uses a try/catch pattern for proper error handling
   */
  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/analytics`);

      if (!response.ok) {
        // Get error message from response if available
        let errorMessage = `HTTP ${response.status}: Failed to load analytics`;
        try {
          const text = await response.text();
          if (text) {
            // Try to parse as JSON, fallback to text
            try {
              const parsed = JSON.parse(text);
              if (typeof parsed === 'string') {
                errorMessage = parsed;
              } else if (parsed.message) {
                errorMessage = parsed.message;
              }
            } catch {
              // Not JSON, use text as-is
              errorMessage = text || errorMessage;
            }
          }
        } catch {
          // Ignore parsing errors, use default message
        }
        throw new Error(errorMessage);
      }

      const result: AnalyticsData = await response.json();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load analytics";
      setError(message);
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Initial data loading on component mount
   * Uses a cancellation token to prevent memory leaks
   */
  useEffect(() => {
    let cancelled = false;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/api/analytics`);

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: Failed to load analytics`;
          try {
            const text = await response.text();
            if (text) {
              try {
                const parsed = JSON.parse(text);
                errorMessage = typeof parsed === 'string' ? parsed : parsed.message || errorMessage;
              } catch {
                errorMessage = text || errorMessage;
              }
            }
          } catch {
            // Ignore parsing errors
          }
          throw new Error(errorMessage);
        }

        const result: AnalyticsData = await response.json();

        // Only update state if component is still mounted
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load analytics";
          setError(message);
          console.error("Analytics fetch error:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchAnalytics();

    // Cleanup: cancel any ongoing operations
    return () => {
      cancelled = true;
    };
  }, []); // Empty dependency array = run once on mount

  // ==========================================================
  // COMPUTED VALUES (Memoized)
  // ==========================================================

  /**
   * Reverses daily trend data to show most recent first
   * This is done client-side to avoid additional API calls
   */
  const dailyChart = useMemo(() => {
    if (!data) {
      return [];
    }
    return [...data.daily_trend].reverse();
  }, [data]);

  /**
   * Calculate the maximum daily revenue for scaling chart bars
   * Ensures chart bars are proportional even with small values
   */
  const maxDailyRevenue = useMemo(() => {
    if (dailyChart.length === 0) {
      return 1; // Avoid division by zero
    }
    return Math.max(...dailyChart.map((item) => item.revenue), 1);
  }, [dailyChart]);

  // ==========================================================
  // RENDER HELPERS
  // ==========================================================

  /**
   * Loading state renderer
   * Shows a centered loading message with accessible aria-label
   */
  if (loading) {
    return (
      <div
        className="loading"
        role="status"
        aria-label="Loading analytics data"
      >
        Loading analytics...
      </div>
    );
  }

  /**
   * Error state renderer
   * Shows the error message with a retry button
   * Error message is displayed in a visually distinct container
   */
  if (error) {
    return (
      <div className="analytics-page">
        <div className="page-header">
          <div>
            <h2>Analytics</h2>
            <p>Detailed analysis of your sales, profitability, products, and inventory.</p>
          </div>
        </div>

        <div className="error" role="alert">
          <strong>Error loading analytics:</strong> {error}
        </div>

        <button
          className="refresh-button"
          onClick={loadAnalytics}
          aria-label="Retry loading analytics"
        >
          Try Again
        </button>
      </div>
    );
  }

  /**
   * Guard: If no data after loading, return null
   * This prevents rendering empty components
   */
  if (!data) {
    return null;
  }

  // Destructure data for cleaner code
  const { sales_metrics, margins, top_products, inventory } = data;

  // ==========================================================
  // MAIN RENDER
  // ==========================================================

  return (
    <div className="analytics-page" role="main" aria-label="Analytics Dashboard">

      {/* ==========================================================
          HEADER
          ========================================================== */}
      <header className="page-header" aria-label="Analytics header">
        <div>
          <h2>Analytics</h2>
          <p>
            Detailed analysis of your sales, profitability, products, and
            inventory.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={loadAnalytics}
          disabled={loading}
          aria-label="Refresh analytics data"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </header>

      {/* ==========================================================
          FINANCIAL SUMMARY CARDS
          
          Four key metrics displayed prominently:
          - Revenue
          - COGS (Cost of Goods Sold)
          - Gross Profit
          - Net Profit
          
          Each card shows the value with additional context
          ========================================================== */}

      <section className="summary-grid" aria-label="Financial summary">
        {/* Revenue Card */}
        <div className="summary-card revenue-card">
          <span className="summary-label">Revenue</span>
          <strong>{formatMoney(sales_metrics.revenue)}</strong>
          <span className="summary-detail">
            {sales_metrics.total_sales} sales
          </span>
        </div>

        {/* COGS Card */}
        <div className="summary-card expense-card">
          <span className="summary-label">COGS</span>
          <strong>{formatMoney(sales_metrics.cogs)}</strong>
          <span className="summary-detail">
            {sales_metrics.total_units_sold} units sold
          </span>
        </div>

        {/* Gross Profit Card */}
        <div className="summary-card profit-card">
          <span className="summary-label">Gross Profit</span>
          <strong>{formatMoney(sales_metrics.gross_profit)}</strong>
          <span className="summary-detail">
            {formatPercent(margins.gross_margin)} margin
          </span>
        </div>

        {/* Net Profit Card */}
        <div className="summary-card profit-card">
          <span className="summary-label">Net Profit</span>
          <strong>{formatMoney(sales_metrics.net_profit)}</strong>
          <span className="summary-detail">
            {formatPercent(margins.net_margin)} margin
          </span>
        </div>
      </section>

      {/* ==========================================================
          KEY METRICS
          
          Additional performance indicators displayed in a grid:
          - Total Sales count
          - Units Sold
          - Average Sale Value
          - Total Expenses
          - Gross Margin percentage
          - Net Margin percentage
          ========================================================== */}

      <section className="card" aria-label="Key performance metrics">
        <div className="card-header">
          <div>
            <h3>Key Metrics</h3>
            <p>Overall business performance.</p>
          </div>
        </div>

        <div className="metric-grid">
          <div className="metric">
            <span>Total Sales</span>
            <strong>{sales_metrics.total_sales}</strong>
          </div>

          <div className="metric">
            <span>Units Sold</span>
            <strong>{sales_metrics.total_units_sold}</strong>
          </div>

          <div className="metric">
            <span>Average Sale</span>
            <strong>{formatMoney(sales_metrics.average_sale_value)}</strong>
          </div>

          <div className="metric">
            <span>Expenses</span>
            <strong>{formatMoney(sales_metrics.expenses)}</strong>
          </div>

          <div className="metric">
            <span>Gross Margin</span>
            <strong>{formatPercent(margins.gross_margin)}</strong>
          </div>

          <div className="metric">
            <span>Net Margin</span>
            <strong>{formatPercent(margins.net_margin)}</strong>
          </div>
        </div>
      </section>

      {/* ==========================================================
          DAILY PERFORMANCE CHART
          
          Visual representation of daily revenue and profit trends
          using horizontal progress bars.
          
          Each day shows:
          - Date label
          - Revenue bar (blue)
          - Gross profit bar (green)
          - Net profit value
          ========================================================== */}

      <section className="card" aria-label="Daily performance chart">
        <div className="card-header">
          <div>
            <h3>Daily Performance</h3>
            <p>Revenue and profit performance by day.</p>
          </div>
        </div>

        {dailyChart.length === 0 ? (
          <div className="empty-state" role="status">
            No daily performance data available.
          </div>
        ) : (
          <div className="analytics-chart" role="list" aria-label="Daily performance data">
            {dailyChart.map((item) => {
              // Calculate bar widths as percentages of maximum daily revenue
              const revenueWidth = (item.revenue / maxDailyRevenue) * 100;
              const profitWidth = item.gross_profit > 0
                ? (item.gross_profit / maxDailyRevenue) * 100
                : 0;

              return (
                <div className="chart-row" key={item.date} role="listitem">
                  {/* Date label */}
                  <div className="chart-label">{formatDate(item.date)}</div>

                  {/* Revenue and Profit bars */}
                  <div className="chart-bars">
                    {/* Revenue Bar */}
                    <div className="chart-bar-group">
                      <span>Revenue</span>
                      <div className="chart-track">
                        <div
                          className="chart-bar revenue-bar"
                          style={{ width: `${Math.min(revenueWidth, 100)}%` }}
                          role="progressbar"
                          aria-valuenow={revenueWidth}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label="Revenue"
                        />
                      </div>
                      <strong>{formatMoney(item.revenue)}</strong>
                    </div>

                    {/* Gross Profit Bar */}
                    <div className="chart-bar-group">
                      <span>Gross Profit</span>
                      <div className="chart-track">
                        <div
                          className="chart-bar profit-bar"
                          style={{ width: `${Math.min(profitWidth, 100)}%` }}
                          role="progressbar"
                          aria-valuenow={profitWidth}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label="Gross Profit"
                        />
                      </div>
                      <strong>{formatMoney(item.gross_profit)}</strong>
                    </div>
                  </div>

                  {/* Net Profit (right column) */}
                  <div className="chart-net-profit">
                    <span>Net</span>
                    <strong>{formatMoney(item.net_profit)}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ==========================================================
          MONTHLY PERFORMANCE TABLE
          
          Historical data displayed in a sortable table format
          showing month-by-month financial performance
          ========================================================== */}

      <section className="card" aria-label="Monthly performance history">
        <div className="card-header">
          <div>
            <h3>Monthly Performance</h3>
            <p>Historical revenue, cost, and profitability.</p>
          </div>
        </div>

        {data.monthly_trend.length === 0 ? (
          <div className="empty-state" role="status">
            No monthly performance data available.
          </div>
        ) : (
          <div className="table-wrapper">
            <table aria-label="Monthly performance table">
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">Revenue</th>
                  <th scope="col">COGS</th>
                  <th scope="col">Gross Profit</th>
                  <th scope="col">Expenses</th>
                  <th scope="col">Net Profit</th>
                </tr>
              </thead>

              <tbody>
                {data.monthly_trend.map((item) => (
                  <tr key={`${item.year}-${item.month}`}>
                    <td>
                      <strong>{formatMonth(item.year, item.month)}</strong>
                    </td>
                    <td>{formatMoney(item.revenue)}</td>
                    <td>{formatMoney(item.cogs)}</td>
                    <td>{formatMoney(item.gross_profit)}</td>
                    <td>{formatMoney(item.expenses)}</td>
                    <td>
                      <strong>{formatMoney(item.net_profit)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ==========================================================
          TOP PRODUCTS TABLE
          
          Products ranked by sales revenue:
          - Product name
          - Units sold
          - Revenue generated
          - COGS
          - Gross profit
          ========================================================== */}

      <section className="card" aria-label="Top performing products">
        <div className="card-header">
          <div>
            <h3>Top Products</h3>
            <p>Products ranked by sales revenue.</p>
          </div>
        </div>

        {top_products.length === 0 ? (
          <div className="empty-state" role="status">
            No product sales data available.
          </div>
        ) : (
          <div className="table-wrapper">
            <table aria-label="Top products table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Units Sold</th>
                  <th scope="col">Revenue</th>
                  <th scope="col">COGS</th>
                  <th scope="col">Gross Profit</th>
                </tr>
              </thead>

              <tbody>
                {top_products.map((product) => (
                  <tr key={product.product_id}>
                    <td>
                      <strong>{product.product_name}</strong>
                    </td>
                    <td>{product.units_sold}</td>
                    <td>{formatMoney(product.revenue)}</td>
                    <td>{formatMoney(product.cogs)}</td>
                    <td>
                      <strong>{formatMoney(product.gross_profit)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ==========================================================
          INVENTORY OVERVIEW
          
          Current inventory snapshot:
          - Number of products
          - Units in stock
          - Stock cost value (at cost price)
          - Potential sales value (at selling price)
          - Potential gross profit (selling - cost)
          ========================================================== */}

      <section className="card" aria-label="Inventory overview">
        <div className="card-header">
          <div>
            <h3>Inventory Overview</h3>
            <p>Current stock position and potential value.</p>
          </div>
        </div>

        <div className="metric-grid">
          <div className="metric">
            <span>Products</span>
            <strong>{inventory.products}</strong>
          </div>

          <div className="metric">
            <span>Units in Stock</span>
            <strong>{inventory.units_in_stock}</strong>
          </div>

          <div className="metric">
            <span>Stock Cost Value</span>
            <strong>{formatMoney(inventory.stock_cost_value)}</strong>
          </div>

          <div className="metric">
            <span>Potential Sales Value</span>
            <strong>{formatMoney(inventory.potential_sales_value)}</strong>
          </div>

          <div className="metric">
            <span>Potential Gross Profit</span>
            <strong>{formatMoney(inventory.potential_gross_profit)}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Analytics;
