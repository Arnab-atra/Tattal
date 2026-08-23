import { useEffect, useMemo, useState } from "react";

type Summary = {
  revenue: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
};

type Growth = {
  revenue: number | null;
  cogs: number | null;
  gross_profit: number | null;
  expenses: number | null;
  net_profit: number | null;
};

type MonthlyHistory = {
  year: number;
  month: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
};

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

type ReportPeriod = "month" | "previous-month" | "year" | "all-time";

const API_URL = "http://127.0.0.1:3000";

function Reports() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const [period, setPeriod] = useState<ReportPeriod>("month");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // --------------------------------------------------
  // LOAD REPORT DATA
  // --------------------------------------------------

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/dashboard`);

      if (!response.ok) {
        throw new Error("Failed to load reports.");
      }

      const data: DashboardData = await response.json();

      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // --------------------------------------------------
  // FORMATTING
  // --------------------------------------------------

  const formatMoney = (amount: number) => {
    return `₹${(amount / 100).toFixed(2)}`;
  };

  const formatMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  };

  // --------------------------------------------------
  // PREVIOUS MONTH
  // --------------------------------------------------

  const getPreviousMonth = () => {
    if (!dashboard) {
      return null;
    }

    const currentDate = new Date(`${dashboard.date}T00:00:00`);

    currentDate.setMonth(currentDate.getMonth() - 1);

    return {
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
    };
  };

  // --------------------------------------------------
  // SELECTED REPORT
  // --------------------------------------------------

  const selectedReport = useMemo(() => {
    if (!dashboard) {
      return null;
    }

    // ----------------------------------------------
    // CURRENT MONTH
    // ----------------------------------------------

    if (period === "month") {
      return {
        title: "This Month",

        description: "Current month's business performance.",

        summary: dashboard.month.summary,

        growth: dashboard.month.growth,
      };
    }

    // ----------------------------------------------
    // CURRENT YEAR
    // ----------------------------------------------

    if (period === "year") {
      return {
        title: "This Year",

        description: "Current year's business performance.",

        summary: dashboard.year.summary,

        growth: dashboard.year.growth,
      };
    }

    // ----------------------------------------------
    // ALL TIME
    // ----------------------------------------------

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

    // ----------------------------------------------
    // PREVIOUS MONTH
    // ----------------------------------------------

    const previousMonth = getPreviousMonth();

    if (!previousMonth) {
      return null;
    }

    const history = dashboard.monthly_history.find(
      (item) =>
        item.year === previousMonth.year && item.month === previousMonth.month,
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
  }, [dashboard, period]);

  // --------------------------------------------------
  // GROWTH DISPLAY
  // --------------------------------------------------

  const renderGrowth = (value: number | null) => {
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

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return <div className="loading">Loading reports...</div>;
  }

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

  if (error) {
    return (
      <>
        <div className="error">{error}</div>

        <button onClick={loadReports}>Try Again</button>
      </>
    );
  }

  // --------------------------------------------------
  // NO DATA
  // --------------------------------------------------

  if (!dashboard || !selectedReport) {
    return null;
  }

  const history = [...dashboard.monthly_history].reverse();

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <>
      {/* ==========================================
          HEADER
      ========================================== */}

      <div className="page-header">
        <div>
          <h2>Reports</h2>

          <p>Analyze your business performance and financial history.</p>
        </div>

        <button
          className="refresh-button"
          onClick={loadReports}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {/* ==========================================
          REPORT PERIOD
      ========================================== */}

      <section className="card">
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
          >
            <option value="month">This Month</option>

            <option value="previous-month">Previous Month</option>

            <option value="year">This Year</option>

            <option value="all-time">All Time</option>
          </select>
        </div>
      </section>

      {/* ==========================================
          SELECTED PERIOD SUMMARY
      ========================================== */}

      <section className="card">
        <div className="card-header">
          <div>
            <h3>{selectedReport.title}</h3>

            <p>{selectedReport.description}</p>
          </div>
        </div>

        <div className="summary-grid">
          {/* REVENUE */}

          <div className="summary-card revenue-card">
            <span className="summary-label">Revenue</span>

            <strong>{formatMoney(selectedReport.summary.revenue)}</strong>

            {renderGrowth(selectedReport.growth.revenue)}
          </div>

          {/* COGS */}

          <div className="summary-card expense-card">
            <span className="summary-label">COGS</span>

            <strong>{formatMoney(selectedReport.summary.cogs)}</strong>

            {renderGrowth(selectedReport.growth.cogs)}
          </div>

          {/* GROSS PROFIT */}

          <div className="summary-card profit-card">
            <span className="summary-label">Gross Profit</span>

            <strong>{formatMoney(selectedReport.summary.gross_profit)}</strong>

            {renderGrowth(selectedReport.growth.gross_profit)}
          </div>

          {/* EXPENSES */}

          <div className="summary-card expense-card">
            <span className="summary-label">Operating Expenses</span>

            <strong>{formatMoney(selectedReport.summary.expenses)}</strong>

            {renderGrowth(selectedReport.growth.expenses)}
          </div>

          {/* NET PROFIT */}

          <div className="summary-card profit-card">
            <span className="summary-label">Net Profit</span>

            <strong>{formatMoney(selectedReport.summary.net_profit)}</strong>

            {renderGrowth(selectedReport.growth.net_profit)}
          </div>
        </div>
      </section>

      {/* ==========================================
          PROFIT ANALYSIS
      ========================================== */}

      <section className="card">
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

      {/* ==========================================
          GROWTH ANALYSIS
      ========================================== */}

      <section className="card">
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

            {renderGrowth(selectedReport.growth.revenue)}
          </div>

          <div className="metric">
            <span>COGS Growth</span>

            <strong>
              {selectedReport.growth.cogs === null
                ? "N/A"
                : `${selectedReport.growth.cogs.toFixed(1)}%`}
            </strong>

            {renderGrowth(selectedReport.growth.cogs)}
          </div>

          <div className="metric">
            <span>Gross Profit Growth</span>

            <strong>
              {selectedReport.growth.gross_profit === null
                ? "N/A"
                : `${selectedReport.growth.gross_profit.toFixed(1)}%`}
            </strong>

            {renderGrowth(selectedReport.growth.gross_profit)}
          </div>

          <div className="metric">
            <span>Expense Growth</span>

            <strong>
              {selectedReport.growth.expenses === null
                ? "N/A"
                : `${selectedReport.growth.expenses.toFixed(1)}%`}
            </strong>

            {renderGrowth(selectedReport.growth.expenses)}
          </div>

          <div className="metric">
            <span>Net Profit Growth</span>

            <strong>
              {selectedReport.growth.net_profit === null
                ? "N/A"
                : `${selectedReport.growth.net_profit.toFixed(1)}%`}
            </strong>

            {renderGrowth(selectedReport.growth.net_profit)}
          </div>
        </div>
      </section>

      {/* ==========================================
          MONTHLY HISTORY
      ========================================== */}

      <section className="card">
        <div className="card-header">
          <div>
            <h3>Monthly Performance</h3>

            <p>Historical financial performance by month.</p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="empty-state">
            No monthly financial history available yet.
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Revenue</th>
                  <th>COGS</th>
                  <th>Gross Profit</th>
                  <th>Expenses</th>
                  <th>Net Profit</th>
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

      {/* ==========================================
          ALL-TIME BUSINESS OVERVIEW
      ========================================== */}

      <section className="card">
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
    </>
  );
}

export default Reports;
