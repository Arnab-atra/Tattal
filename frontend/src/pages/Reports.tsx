// ============================================================
// Reports.tsx
// 
// A comprehensive reporting component that provides:
// - Period selection (This Month, Previous Month, This Year, All Time)
// - Financial summary for selected period
// - Profit analysis with breakdown
// - Growth analysis with percentage changes
// - Monthly historical performance table
// - Business overview with all-time totals
// - Responsive and accessible UI
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import "./Reports.css";

// ============================================================
// TYPES
// ============================================================

/**
 * Financial summary for a specific period
 */
type Summary = {
  revenue: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
};

/**
 * Growth percentages compared to previous period
 * null indicates no comparison available
 */
type Growth = {
  revenue: number | null;
  cogs: number | null;
  gross_profit: number | null;
  expenses: number | null;
  net_profit: number | null;
};

/**
 * Monthly financial history record
 */
type MonthlyHistory = {
  year: number;
  month: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
};

/**
 * Complete dashboard data from API
 */
type DashboardData = {
  date: string;
  today: Summary;
  month: {
    summary: Summary;
    growth: Growth;
  };
  year: {
    summary: Summary;
    growth: Growth;
  };
  all_time: Summary;
  monthly_history: MonthlyHistory[];
};

/**
 * Report period options
 */
type ReportPeriod = "month" | "previous-month" | "year" | "all-time";

/**
 * Selected report data
 */
type SelectedReport = {
  title: string;
  description: string;
  summary: Summary;
  growth: Growth;
};

// ============================================================
// CONSTANTS
// ============================================================

// Use environment variable for API URL with fallback
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3000";

// Report period options for the dropdown
const REPORT_PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: "month", label: "This Month" },
  { value: "previous-month", label: "Previous Month" },
  { value: "year", label: "This Year" },
  { value: "all-time", label: "All Time" },
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Formats a monetary value in Indian Rupees (₹)
 * @param amount - Value in paise (1/100 of a rupee)
 * @returns Formatted currency string
 */
const formatMoney = (amount: number): string => {
  return `₹${(amount / 100).toFixed(2)}`;
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

/**
 * Renders a growth indicator with arrow and percentage
 */
const GrowthIndicator = ({ value }: { value: number | null }) => {
  if (value === null) {
    return <span className="growth neutral">N/A</span>;
  }

  const positive = value >= 0;

  return (
    <span className={`growth ${positive ? "positive" : "negative"}`}>
      {positive ? "↑" : "↓"} {Math.abs(value).toFixed(1)}%
    </span>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

function Reports() {
  // ==========================================================
  // STATE
  // ==========================================================

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================================
  // DATA FETCHING
  // ==========================================================

  /**
   * Fetches report data from the API
   */
  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/dashboard`);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: Failed to load reports`;
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

      const data: DashboardData = await response.json();
      setDashboard(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load reports";
      setError(message);
      console.error("Reports fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================
  // EFFECTS
  // ==========================================================

  /**
   * Initial data loading on component mount
   * Uses cancellation token to prevent memory leaks
   */
  useEffect(() => {
    let cancelled = false;

    const fetchReports = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/api/dashboard`);

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: Failed to load reports`;
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

        const data: DashboardData = await response.json();

        if (!cancelled) {
          setDashboard(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load reports";
          setError(message);
          console.error("Reports fetch error:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchReports();

    return () => {
      cancelled = true;
    };
  }, []); // Empty dependency array = run once on mount

  // ==========================================================
  // COMPUTED VALUES
  // ==========================================================

  /**
   * Calculates the previous month based on the current date
   */
  const getPreviousMonth = useCallback((): { year: number; month: number } | null => {
    if (!dashboard) return null;

    const currentDate = new Date(`${dashboard.date}T00:00:00`);
    currentDate.setMonth(currentDate.getMonth() - 1);

    return {
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
    };
  }, [dashboard]);

  /**
   * Gets the selected report data based on the current period
   */
  const selectedReport = useMemo<SelectedReport | null>(() => {
    if (!dashboard) return null;

    // This Month
    if (period === "month") {
      return {
        title: "This Month",
        description: "Current month's business performance.",
        summary: dashboard.month.summary,
        growth: dashboard.month.growth,
      };
    }

    // This Year
    if (period === "year") {
      return {
        title: "This Year",
        description: "Current year's business performance.",
        summary: dashboard.year.summary,
        growth: dashboard.year.growth,
      };
    }

    // All Time
    if (period === "all-time") {
      return {
        title: "All Time",
        description: "Complete business performance.",
        summary: dashboard.all_time,
        growth: {
          revenue: null,
          cogs: null,
          gross_profit: null,
          expenses: null,
          net_profit: null,
        },
      };
    }

    // Previous Month
    const previousMonth = getPreviousMonth();
    if (!previousMonth) return null;

    const history = dashboard.monthly_history.find(
      (item) =>
        item.year === previousMonth.year && item.month === previousMonth.month
    );

    const summary: Summary = history
      ? {
        revenue: history.revenue,
        cogs: history.cogs,
        gross_profit: history.gross_profit,
        expenses: history.expenses,
        net_profit: history.net_profit,
      }
      : {
        revenue: 0,
        cogs: 0,
        gross_profit: 0,
        expenses: 0,
        net_profit: 0,
      };

    return {
      title: formatMonth(previousMonth.year, previousMonth.month),
      description: "Previous month's business performance.",
      summary,
      growth: {
        revenue: null,
        cogs: null,
        gross_profit: null,
        expenses: null,
        net_profit: null,
      },
    };
  }, [dashboard, period, getPreviousMonth]);

  /**
   * Reverses monthly history for display (newest first)
   */
  const history = useMemo(() => {
    if (!dashboard) return [];
    return [...dashboard.monthly_history].reverse();
  }, [dashboard]);

  // ==========================================================
  // RENDER HELPERS
  // ==========================================================

  /**
   * Loading state renderer
   */
  if (loading) {
    return (
      <div className="reports-page">
        <div className="loading" role="status" aria-label="Loading reports">
          Loading reports...
        </div>
      </div>
    );
  }

  /**
   * Error state renderer
   */
  if (error) {
    return (
      <div className="reports-page">
        <div className="page-header">
          <div>
            <h2>Reports</h2>
            <p>Analyze your business performance and financial history.</p>
          </div>
          <button
            className="refresh-button"
            onClick={() => void loadReports()}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        <div className="error" role="alert">
          <strong>Error loading reports:</strong> {error}
        </div>

        <button
          className="refresh-button"
          onClick={() => void loadReports()}
          style={{ alignSelf: 'flex-start' }}
        >
          Try Again
        </button>
      </div>
    );
  }

  /**
   * Guard: If no data after loading, return null
   */
  if (!dashboard || !selectedReport) {
    return null;
  }

  // ==========================================================
  // MAIN RENDER
  // ==========================================================

  return (
    <div className="reports-page" role="main" aria-label="Reports Dashboard">

      {/* ==========================================================
          HEADER
          ========================================================== */}
      <header className="page-header" aria-label="Reports header">
        <div>
          <h2>Reports</h2>
          <p>Analyze your business performance and financial history.</p>
        </div>

        <button
          className="refresh-button"
          onClick={() => void loadReports()}
          disabled={loading}
          aria-label="Refresh reports data"
        >
          Refresh
        </button>
      </header>

      {/* ==========================================================
          REPORT PERIOD SELECTOR
          ========================================================== */}
      <section className="card" aria-label="Report period selector">
        <div className="card-header">
          <div>
            <h3>Report Period</h3>
            <p>Select the period you want to analyze.</p>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="report-period">Period</label>
          <select
            id="report-period"
            value={period}
            onChange={(event) => setPeriod(event.target.value as ReportPeriod)}
            aria-label="Select report period"
          >
            {REPORT_PERIODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* ==========================================================
          SELECTED PERIOD SUMMARY
          ========================================================== */}
      <section className="card" aria-label="Selected period summary">
        <div className="card-header">
          <div>
            <h3>{selectedReport.title}</h3>
            <p>{selectedReport.description}</p>
          </div>
        </div>

        <div className="summary-grid">
          {/* Revenue */}
          <div className="summary-card revenue-card">
            <span className="summary-label">Revenue</span>
            <strong>{formatMoney(selectedReport.summary.revenue)}</strong>
            <GrowthIndicator value={selectedReport.growth.revenue} />
          </div>

          {/* COGS */}
          <div className="summary-card expense-card">
            <span className="summary-label">COGS</span>
            <strong>{formatMoney(selectedReport.summary.cogs)}</strong>
            <GrowthIndicator value={selectedReport.growth.cogs} />
          </div>

          {/* Gross Profit */}
          <div className="summary-card profit-card">
            <span className="summary-label">Gross Profit</span>
            <strong>{formatMoney(selectedReport.summary.gross_profit)}</strong>
            <GrowthIndicator value={selectedReport.growth.gross_profit} />
          </div>

          {/* Expenses */}
          <div className="summary-card expense-card">
            <span className="summary-label">Operating Expenses</span>
            <strong>{formatMoney(selectedReport.summary.expenses)}</strong>
            <GrowthIndicator value={selectedReport.growth.expenses} />
          </div>

          {/* Net Profit */}
          <div className="summary-card profit-card">
            <span className="summary-label">Net Profit</span>
            <strong>{formatMoney(selectedReport.summary.net_profit)}</strong>
            <GrowthIndicator value={selectedReport.growth.net_profit} />
          </div>
        </div>
      </section>

      {/* ==========================================================
          PROFIT ANALYSIS
          ========================================================== */}
      <section className="card" aria-label="Profit analysis">
        <div className="card-header">
          <div>
            <h3>Profit Analysis</h3>
            <p>Revenue, cost of goods sold and profitability breakdown.</p>
          </div>
        </div>

        <div className="metric-grid">
          <div className="metric">
            <span>Revenue</span>
            <strong>{formatMoney(selectedReport.summary.revenue)}</strong>
          </div>

          <div className="metric">
            <span>Cost of Goods Sold</span>
            <strong>{formatMoney(selectedReport.summary.cogs)}</strong>
          </div>

          <div className="metric">
            <span>Gross Profit</span>
            <strong>{formatMoney(selectedReport.summary.gross_profit)}</strong>
          </div>

          <div className="metric">
            <span>Operating Expenses</span>
            <strong>{formatMoney(selectedReport.summary.expenses)}</strong>
          </div>

          <div className="metric">
            <span>Net Profit</span>
            <strong>{formatMoney(selectedReport.summary.net_profit)}</strong>
          </div>
        </div>
      </section>

      {/* ==========================================================
          GROWTH ANALYSIS
          ========================================================== */}
      <section className="card" aria-label="Growth analysis">
        <div className="card-header">
          <div>
            <h3>Growth Analysis</h3>
            <p>Performance compared with the previous period.</p>
          </div>
        </div>

        <div className="metric-grid">
          <div className="metric">
            <span>Revenue Growth</span>
            <strong>
              {selectedReport.growth.revenue === null
                ? "N/A"
                : `${selectedReport.growth.revenue.toFixed(1)}%`}
            </strong>
            <GrowthIndicator value={selectedReport.growth.revenue} />
          </div>

          <div className="metric">
            <span>COGS Growth</span>
            <strong>
              {selectedReport.growth.cogs === null
                ? "N/A"
                : `${selectedReport.growth.cogs.toFixed(1)}%`}
            </strong>
            <GrowthIndicator value={selectedReport.growth.cogs} />
          </div>

          <div className="metric">
            <span>Gross Profit Growth</span>
            <strong>
              {selectedReport.growth.gross_profit === null
                ? "N/A"
                : `${selectedReport.growth.gross_profit.toFixed(1)}%`}
            </strong>
            <GrowthIndicator value={selectedReport.growth.gross_profit} />
          </div>

          <div className="metric">
            <span>Expense Growth</span>
            <strong>
              {selectedReport.growth.expenses === null
                ? "N/A"
                : `${selectedReport.growth.expenses.toFixed(1)}%`}
            </strong>
            <GrowthIndicator value={selectedReport.growth.expenses} />
          </div>

          <div className="metric">
            <span>Net Profit Growth</span>
            <strong>
              {selectedReport.growth.net_profit === null
                ? "N/A"
                : `${selectedReport.growth.net_profit.toFixed(1)}%`}
            </strong>
            <GrowthIndicator value={selectedReport.growth.net_profit} />
          </div>
        </div>
      </section>

      {/* ==========================================================
          MONTHLY HISTORY
          ========================================================== */}
      <section className="card" aria-label="Monthly performance history">
        <div className="card-header">
          <div>
            <h3>Monthly Performance</h3>
            <p>Historical financial performance by month.</p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="empty-state" role="status">
            <strong>No data available</strong>
            <span>No monthly financial history available yet.</span>
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
                {history.map((item) => (
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
          BUSINESS OVERVIEW (All-Time Totals)
          ========================================================== */}
      <section className="card" aria-label="Business overview">
        <div className="card-header">
          <div>
            <h3>Business Overview</h3>
            <p>All-time financial totals.</p>
          </div>
        </div>

        <div className="metric-grid">
          <div className="metric">
            <span>Total Revenue</span>
            <strong>{formatMoney(dashboard.all_time.revenue)}</strong>
          </div>

          <div className="metric">
            <span>Total COGS</span>
            <strong>{formatMoney(dashboard.all_time.cogs)}</strong>
          </div>

          <div className="metric">
            <span>Total Gross Profit</span>
            <strong>{formatMoney(dashboard.all_time.gross_profit)}</strong>
          </div>

          <div className="metric">
            <span>Total Expenses</span>
            <strong>{formatMoney(dashboard.all_time.expenses)}</strong>
          </div>

          <div className="metric">
            <span>Total Net Profit</span>
            <strong>{formatMoney(dashboard.all_time.net_profit)}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Reports;
