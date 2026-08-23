import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  DollarSign,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

type InventoryProduct = {
  id: string;
  name: string;
  sku: string | null;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
};

type InventoryMovement = {
  id: string;
  product_id: string;
  movement_type: "IN" | "OUT" | string;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
};

const API_URL = "http://127.0.0.1:3000";

function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [inventoryProducts, setInventoryProducts] = useState<
    InventoryProduct[]
  >([]);
  const [inventoryMovements, setInventoryMovements] = useState<
    (InventoryMovement & { product_name: string })[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [error, setError] = useState("");

  const formatMoney = (amount: number) =>
    `₹${(amount / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatCompactMoney = (amount: number) => {
    const rupees = amount / 100;

    if (Math.abs(rupees) >= 10000000) {
      return `₹${(rupees / 10000000).toFixed(1)}Cr`;
    }

    if (Math.abs(rupees) >= 100000) {
      return `₹${(rupees / 100000).toFixed(1)}L`;
    }

    if (Math.abs(rupees) >= 1000) {
      return `₹${(rupees / 1000).toFixed(1)}K`;
    }

    return `₹${rupees.toFixed(0)}`;
  };

  const formatDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const formatMonth = (year: number, month: number) =>
    new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });

  const formatMovementDate = (date: string) =>
    new Date(date).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/dashboard`);

      if (!response.ok) {
        throw new Error("Unable to load dashboard data.");
      }

      const data: DashboardData = await response.json();
      setDashboard(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load dashboard data.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadInventory = async () => {
    try {
      setInventoryLoading(true);

      const response = await fetch(`${API_URL}/api/products`);

      if (!response.ok) {
        throw new Error("Unable to load inventory.");
      }

      const products: InventoryProduct[] = await response.json();
      setInventoryProducts(products);

      if (products.length === 0) {
        setInventoryMovements([]);
        return;
      }

      const movementResults = await Promise.all(
        products.map(async (product) => {
          try {
            const movementResponse = await fetch(
              `${API_URL}/api/products/${product.id}/inventory`,
            );

            if (!movementResponse.ok) {
              return [];
            }

            const movements: InventoryMovement[] =
              await movementResponse.json();

            return movements.map((movement) => ({
              ...movement,
              product_name: product.name,
            }));
          } catch {
            return [];
          }
        }),
      );

      const movements = movementResults
        .flat()
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime(),
        )
        .slice(0, 8);

      setInventoryMovements(movements);
    } catch {
      setInventoryProducts([]);
      setInventoryMovements([]);
    } finally {
      setInventoryLoading(false);
    }
  };

  const refreshDashboard = async () => {
    await Promise.all([loadDashboard(), loadInventory()]);
  };

  useEffect(() => {
    refreshDashboard();
  }, []);

  const stockValue = useMemo(
    () =>
      inventoryProducts.reduce(
        (total, product) =>
          total + product.cost_price * product.stock_quantity,
        0,
      ),
    [inventoryProducts],
  );

  const potentialSalesValue = useMemo(
    () =>
      inventoryProducts.reduce(
        (total, product) =>
          total + product.selling_price * product.stock_quantity,
        0,
      ),
    [inventoryProducts],
  );

  const totalUnits = useMemo(
    () =>
      inventoryProducts.reduce(
        (total, product) => total + product.stock_quantity,
        0,
      ),
    [inventoryProducts],
  );

  const lowStockProducts = useMemo(
    () =>
      inventoryProducts
        .filter((product) => product.stock_quantity <= 5)
        .sort((a, b) => a.stock_quantity - b.stock_quantity),
    [inventoryProducts],
  );

  const chartData = useMemo(
    () =>
      dashboard?.monthly_history.map((item) => ({
        name: formatMonth(item.year, item.month),
        revenue: item.revenue / 100,
        expenses: item.expenses / 100,
        profit: item.net_profit / 100,
      })) ?? [],
    [dashboard],
  );

  const renderGrowth = (value: number | null) => {
    if (value === null) {
      return <span className="dashboard-growth neutral">No comparison</span>;
    }

    const positive = value >= 0;

    return (
      <span
        className={`dashboard-growth ${
          positive ? "positive" : "negative"
        }`}
      >
        {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  if (loading && !dashboard) {
    return (
      <div className="dashboard-state">
        <div className="dashboard-spinner" />
        <strong>Loading dashboard</strong>
        <span>Preparing your business overview...</span>
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="dashboard-state dashboard-state-error">
        <AlertTriangle size={28} />
        <strong>Dashboard unavailable</strong>
        <span>{error}</span>
        <button className="dashboard-primary-button" onClick={refreshDashboard}>
          Try again
        </button>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <div className="dashboard-page">
      {/* HEADER */}

      <div className="dashboard-header">
        <div>
          <div className="dashboard-eyebrow">BUSINESS OVERVIEW</div>
          <h2>Dashboard</h2>
          <p>{formatDate(dashboard.date)}</p>
        </div>

        <button
          className="dashboard-refresh-button"
          onClick={refreshDashboard}
          disabled={loading || inventoryLoading}
        >
          <RefreshCw
            size={16}
            className={loading || inventoryLoading ? "spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* TODAY'S KPI CARDS */}

      <section className="dashboard-kpi-grid">
        <div className="dashboard-kpi-card kpi-revenue">
          <div className="kpi-top">
            <div className="kpi-icon">
              <DollarSign size={18} />
            </div>
            <span>Today</span>
          </div>

          <div className="kpi-label">Revenue</div>
          <strong>{formatMoney(dashboard.today.revenue)}</strong>

          <div className="kpi-foot">
            <span>Sales generated today</span>
          </div>
        </div>

        <div className="dashboard-kpi-card kpi-expense">
          <div className="kpi-top">
            <div className="kpi-icon">
              <Wallet size={18} />
            </div>
            <span>Today</span>
          </div>

          <div className="kpi-label">Expenses</div>
          <strong>{formatMoney(dashboard.today.expenses)}</strong>

          <div className="kpi-foot">
            <span>Business expenses today</span>
          </div>
        </div>

        <div className="dashboard-kpi-card kpi-profit">
          <div className="kpi-top">
            <div className="kpi-icon">
              <TrendingUp size={18} />
            </div>
            <span>Today</span>
          </div>

          <div className="kpi-label">Net Profit</div>
          <strong>{formatMoney(dashboard.today.net_profit)}</strong>

          <div className="kpi-foot">
            <span>Revenue after expenses</span>
          </div>
        </div>

        <div className="dashboard-kpi-card kpi-orders">
          <div className="kpi-top">
            <div className="kpi-icon">
              <ShoppingCart size={18} />
            </div>
            <span>Inventory</span>
          </div>

          <div className="kpi-label">Units in Stock</div>
          <strong>{totalUnits.toLocaleString("en-IN")}</strong>

          <div className="kpi-foot">
            <span>{inventoryProducts.length} products tracked</span>
          </div>
        </div>
      </section>

      {/* MONTH PERFORMANCE */}

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <span className="dashboard-section-kicker">PERFORMANCE</span>
            <h3>This month</h3>
            <p>Current month compared with the previous period.</p>
          </div>
        </div>

        <div className="dashboard-performance-grid">
          <div className="dashboard-performance-card">
            <div className="performance-label">Revenue</div>
            <strong>{formatMoney(dashboard.month.summary.revenue)}</strong>
            {renderGrowth(dashboard.month.growth.revenue)}
          </div>

          <div className="dashboard-performance-card">
            <div className="performance-label">Gross Profit</div>
            <strong>{formatMoney(dashboard.month.summary.gross_profit)}</strong>
            {renderGrowth(dashboard.month.growth.gross_profit)}
          </div>

          <div className="dashboard-performance-card">
            <div className="performance-label">Expenses</div>
            <strong>{formatMoney(dashboard.month.summary.expenses)}</strong>
            {renderGrowth(dashboard.month.growth.expenses)}
          </div>

          <div className="dashboard-performance-card">
            <div className="performance-label">Net Profit</div>
            <strong>{formatMoney(dashboard.month.summary.net_profit)}</strong>
            {renderGrowth(dashboard.month.growth.net_profit)}
          </div>
        </div>
      </section>

      {/* CHARTS */}

      <section className="dashboard-chart-grid">
        <div className="dashboard-panel dashboard-chart-panel">
          <div className="dashboard-panel-header">
            <div>
              <span className="dashboard-section-kicker">TREND</span>
              <h3>Revenue & profit</h3>
              <p>Monthly financial performance.</p>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="dashboard-empty">
              No monthly history available yet.
            </div>
          ) : (
            <div className="dashboard-chart">
              <ResponsiveContainer width="100%" height={290}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={58}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    tickFormatter={(value) => formatCompactMoney(value * 100)}
                  />

                  <Tooltip
                    formatter={(value, name) => [
                      formatMoney(Number(value) * 100),
                      String(name).charAt(0).toUpperCase() + String(name).slice(1),
                    ]}
                    contentStyle={{
                      background: "var(--surface-raised)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      boxShadow: "var(--shadow-md)",
                    }}
                    labelStyle={{
                      color: "var(--text)",
                      fontWeight: 700,
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fill="url(#revenueFill)"
                  />

                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="#16a34a"
                    strokeWidth={2.5}
                    fill="url(#profitFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="dashboard-panel dashboard-chart-panel">
          <div className="dashboard-panel-header">
            <div>
              <span className="dashboard-section-kicker">COMPARISON</span>
              <h3>Revenue vs expenses</h3>
              <p>Monthly operating picture.</p>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="dashboard-empty">
              No monthly history available yet.
            </div>
          ) : (
            <div className="dashboard-chart">
              <ResponsiveContainer width="100%" height={290}>
                <BarChart data={chartData} barGap={5}>
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={58}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    tickFormatter={(value) => formatCompactMoney(value * 100)}
                  />

                  <Tooltip
                    formatter={(value, name) => [
                      formatMoney(Number(value) * 100),
                      String(name).charAt(0).toUpperCase() + String(name).slice(1),
                    ]}
                    contentStyle={{
                      background: "var(--surface-raised)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      boxShadow: "var(--shadow-md)",
                    }}
                  />

                  <Bar
                    dataKey="revenue"
                    fill="#2563eb"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={22}
                  />

                  <Bar
                    dataKey="expenses"
                    fill="#d97706"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* YEAR + ALL TIME */}

      <section className="dashboard-summary-grid">
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <span className="dashboard-section-kicker">YEAR TO DATE</span>
              <h3>This year</h3>
              <p>Current year's business performance.</p>
            </div>
          </div>

          <div className="dashboard-summary-list">
            <div>
              <span>Revenue</span>
              <strong>{formatMoney(dashboard.year.summary.revenue)}</strong>
              {renderGrowth(dashboard.year.growth.revenue)}
            </div>

            <div>
              <span>Gross profit</span>
              <strong>{formatMoney(dashboard.year.summary.gross_profit)}</strong>
              {renderGrowth(dashboard.year.growth.gross_profit)}
            </div>

            <div>
              <span>Expenses</span>
              <strong>{formatMoney(dashboard.year.summary.expenses)}</strong>
              {renderGrowth(dashboard.year.growth.expenses)}
            </div>

            <div className="summary-highlight">
              <span>Net profit</span>
              <strong>{formatMoney(dashboard.year.summary.net_profit)}</strong>
              {renderGrowth(dashboard.year.growth.net_profit)}
            </div>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <span className="dashboard-section-kicker">LIFETIME</span>
              <h3>All time</h3>
              <p>Total performance recorded in the system.</p>
            </div>
          </div>

          <div className="dashboard-summary-list">
            <div>
              <span>Revenue</span>
              <strong>{formatMoney(dashboard.all_time.revenue)}</strong>
            </div>

            <div>
              <span>Gross profit</span>
              <strong>{formatMoney(dashboard.all_time.gross_profit)}</strong>
            </div>

            <div>
              <span>Expenses</span>
              <strong>{formatMoney(dashboard.all_time.expenses)}</strong>
            </div>

            <div className="summary-highlight">
              <span>Net profit</span>
              <strong>{formatMoney(dashboard.all_time.net_profit)}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* INVENTORY */}

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <span className="dashboard-section-kicker">INVENTORY</span>
            <h3>Stock overview</h3>
            <p>Current inventory value and available sales potential.</p>
          </div>
        </div>

        <div className="dashboard-inventory-grid">
          <div className="dashboard-inventory-card">
            <div className="inventory-card-icon">
              <Package size={19} />
            </div>
            <span>Products</span>
            <strong>{inventoryProducts.length}</strong>
            <small>Active catalog items</small>
          </div>

          <div className="dashboard-inventory-card">
            <div className="inventory-card-icon">
              <Boxes size={19} />
            </div>
            <span>Units in stock</span>
            <strong>{totalUnits.toLocaleString("en-IN")}</strong>
            <small>Total available units</small>
          </div>

          <div className="dashboard-inventory-card">
            <div className="inventory-card-icon">
              <Wallet size={19} />
            </div>
            <span>Stock cost value</span>
            <strong>{formatMoney(stockValue)}</strong>
            <small>Current inventory cost</small>
          </div>

          <div className="dashboard-inventory-card">
            <div className="inventory-card-icon">
              <TrendingUp size={19} />
            </div>
            <span>Potential sales</span>
            <strong>{formatMoney(potentialSalesValue)}</strong>
            <small>Value at selling price</small>
          </div>
        </div>
      </section>

      {/* LOW STOCK + MOVEMENTS */}

      <section className="dashboard-two-column">
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <span className="dashboard-section-kicker">ATTENTION</span>
              <h3>Low stock</h3>
              <p>Products with 5 units or fewer remaining.</p>
            </div>

            <div className="panel-header-icon warning">
              <AlertTriangle size={17} />
            </div>
          </div>

          {inventoryLoading ? (
            <div className="dashboard-empty">Loading stock levels...</div>
          ) : lowStockProducts.length === 0 ? (
            <div className="dashboard-empty success-empty">
              <Package size={22} />
              <strong>Inventory looks healthy</strong>
              <span>No products are currently below the low-stock threshold.</span>
            </div>
          ) : (
            <div className="dashboard-list">
              {lowStockProducts.slice(0, 6).map((product) => (
                <div className="dashboard-list-row" key={product.id}>
                  <div className="list-product-icon">
                    <Package size={16} />
                  </div>

                  <div className="list-product-copy">
                    <strong>{product.name}</strong>
                    <span>{product.sku || "No SKU"}</span>
                  </div>

                  <div
                    className={`stock-count ${
                      product.stock_quantity === 0 ? "critical" : ""
                    }`}
                  >
                    {product.stock_quantity}
                    <small>units</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <span className="dashboard-section-kicker">ACTIVITY</span>
              <h3>Recent movements</h3>
              <p>Latest inventory additions and deductions.</p>
            </div>
          </div>

          {inventoryLoading ? (
            <div className="dashboard-empty">Loading movements...</div>
          ) : inventoryMovements.length === 0 ? (
            <div className="dashboard-empty">
              No inventory movements recorded yet.
            </div>
          ) : (
            <div className="dashboard-list">
              {inventoryMovements.slice(0, 6).map((movement) => {
                const incoming = movement.movement_type === "IN";

                return (
                  <div className="dashboard-list-row" key={movement.id}>
                    <div
                      className={`movement-icon ${
                        incoming ? "movement-in" : "movement-out"
                      }`}
                    >
                      {incoming ? (
                        <ArrowUpRight size={16} />
                      ) : (
                        <ArrowDownRight size={16} />
                      )}
                    </div>

                    <div className="list-product-copy">
                      <strong>{movement.product_name}</strong>
                      <span>
                        {movement.reference_type === "SALE"
                          ? "Sale"
                          : movement.reference_type === "STOCK_ADJUSTMENT"
                            ? "Stock adjustment"
                            : movement.reference_type || "Manual movement"}
                        {" · "}
                        {formatMovementDate(movement.created_at)}
                      </span>
                    </div>

                    <strong
                      className={`movement-quantity ${
                        incoming ? "incoming" : "outgoing"
                      }`}
                    >
                      {incoming ? "+" : "-"}
                      {movement.quantity}
                    </strong>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* MONTHLY HISTORY */}

      <section className="dashboard-panel">
        <div className="dashboard-panel-header">
          <div>
            <span className="dashboard-section-kicker">HISTORY</span>
            <h3>Monthly financial history</h3>
            <p>Revenue, expenses and profit recorded by month.</p>
          </div>
        </div>

        {dashboard.monthly_history.length === 0 ? (
          <div className="dashboard-empty">
            No monthly history available yet.
          </div>
        ) : (
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Revenue</th>
                  <th>Expenses</th>
                  <th>Gross profit</th>
                  <th>Net profit</th>
                </tr>
              </thead>

              <tbody>
                {[...dashboard.monthly_history]
                  .reverse()
                  .map((item) => (
                    <tr key={`${item.year}-${item.month}`}>
                      <td>
                        <strong>{formatMonth(item.year, item.month)}</strong>
                      </td>

                      <td>{formatMoney(item.revenue)}</td>

                      <td>{formatMoney(item.expenses)}</td>

                      <td>{formatMoney(item.gross_profit)}</td>

                      <td
                        className={
                          item.net_profit >= 0
                            ? "dashboard-profit"
                            : "dashboard-loss"
                        }
                      >
                        {formatMoney(item.net_profit)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
