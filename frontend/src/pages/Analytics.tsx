import { useEffect, useMemo, useState } from "react";

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

type Margins = {
  gross_margin: number | null;
  net_margin: number | null;
};

type DailyTrend = {
  date: string;
  revenue: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
};

type MonthlyTrend = {
  year: number;
  month: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
};

type TopProduct = {
  product_id: string;
  product_name: string;
  units_sold: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
};

type Inventory = {
  products: number;
  units_in_stock: number;
  stock_cost_value: number;
  potential_sales_value: number;
  potential_gross_profit: number;
};

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

const API_URL = "http://127.0.0.1:3000";

function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/analytics`);

      if (!response.ok) {
        throw new Error("Failed to load analytics.");
      }

      const result: AnalyticsData = await response.json();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load analytics.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const formatMoney = (amount: number) => {
    return `₹${(amount / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatPercent = (value: number | null) => {
    if (value === null) {
      return "N/A";
    }

    return `${value.toFixed(2)}%`;
  };

  const formatDate = (date: string) => {
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  };

  const formatMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  };

  const dailyChart = useMemo(() => {
    if (!data) {
      return [];
    }

    return [...data.daily_trend].reverse();
  }, [data]);

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  if (error) {
    return (
      <>
        <div className="error">{error}</div>

        <button onClick={loadAnalytics}>Try Again</button>
      </>
    );
  }

  if (!data) {
    return null;
  }

  const { sales_metrics, margins, top_products, inventory } = data;

  const maxDailyRevenue = Math.max(
    ...dailyChart.map((item) => item.revenue),
    1,
  );

  return (
    <>
      <div className="page-header">
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
        >
          Refresh
        </button>
      </div>

      {/* -------------------------------------------------- */}
      {/* FINANCIAL SUMMARY */}
      {/* -------------------------------------------------- */}

      <section className="summary-grid">
        <div className="summary-card revenue-card">
          <span className="summary-label">Revenue</span>
          <strong>{formatMoney(sales_metrics.revenue)}</strong>
          <span className="summary-detail">
            {sales_metrics.total_sales} sales
          </span>
        </div>

        <div className="summary-card expense-card">
          <span className="summary-label">COGS</span>
          <strong>{formatMoney(sales_metrics.cogs)}</strong>
          <span className="summary-detail">
            {sales_metrics.total_units_sold} units sold
          </span>
        </div>

        <div className="summary-card profit-card">
          <span className="summary-label">Gross Profit</span>
          <strong>{formatMoney(sales_metrics.gross_profit)}</strong>
          <span className="summary-detail">
            {formatPercent(margins.gross_margin)} margin
          </span>
        </div>

        <div className="summary-card profit-card">
          <span className="summary-label">Net Profit</span>
          <strong>{formatMoney(sales_metrics.net_profit)}</strong>
          <span className="summary-detail">
            {formatPercent(margins.net_margin)} margin
          </span>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* KEY METRICS */}
      {/* -------------------------------------------------- */}

      <section className="card">
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

      {/* -------------------------------------------------- */}
      {/* DAILY PERFORMANCE */}
      {/* -------------------------------------------------- */}

      <section className="card">
        <div className="card-header">
          <div>
            <h3>Daily Performance</h3>
            <p>Revenue and profit performance by day.</p>
          </div>
        </div>

        {dailyChart.length === 0 ? (
          <div className="empty-state">
            No daily performance data available.
          </div>
        ) : (
          <div className="analytics-chart">
            {dailyChart.map((item) => {
              const revenueWidth = (item.revenue / maxDailyRevenue) * 100;

              const profitWidth =
                item.gross_profit > 0
                  ? (item.gross_profit / maxDailyRevenue) * 100
                  : 0;

              return (
                <div className="chart-row" key={item.date}>
                  <div className="chart-label">{formatDate(item.date)}</div>

                  <div className="chart-bars">
                    <div className="chart-bar-group">
                      <span>Revenue</span>

                      <div className="chart-track">
                        <div
                          className="chart-bar revenue-bar"
                          style={{ width: `${revenueWidth}%` }}
                        />
                      </div>

                      <strong>{formatMoney(item.revenue)}</strong>
                    </div>

                    <div className="chart-bar-group">
                      <span>Gross Profit</span>

                      <div className="chart-track">
                        <div
                          className="chart-bar profit-bar"
                          style={{ width: `${profitWidth}%` }}
                        />
                      </div>

                      <strong>{formatMoney(item.gross_profit)}</strong>
                    </div>
                  </div>

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

      {/* -------------------------------------------------- */}
      {/* MONTHLY PERFORMANCE */}
      {/* -------------------------------------------------- */}

      <section className="card">
        <div className="card-header">
          <div>
            <h3>Monthly Performance</h3>
            <p>Historical revenue, cost, and profitability.</p>
          </div>
        </div>

        {data.monthly_trend.length === 0 ? (
          <div className="empty-state">
            No monthly performance data available.
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

      {/* -------------------------------------------------- */}
      {/* TOP PRODUCTS */}
      {/* -------------------------------------------------- */}

      <section className="card">
        <div className="card-header">
          <div>
            <h3>Top Products</h3>
            <p>Products ranked by sales revenue.</p>
          </div>
        </div>

        {top_products.length === 0 ? (
          <div className="empty-state">No product sales data available.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Units Sold</th>
                  <th>Revenue</th>
                  <th>COGS</th>
                  <th>Gross Profit</th>
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

      {/* -------------------------------------------------- */}
      {/* INVENTORY */}
      {/* -------------------------------------------------- */}

      <section className="card">
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
    </>
  );
}

export default Analytics;
