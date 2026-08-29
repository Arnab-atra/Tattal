// ============================================================
// Sales.tsx
// 
// A comprehensive sales management component that provides:
// - Create new sales with multiple products
// - Customer selection
// - Real-time subtotal and total calculation
// - Stock validation before sale
// - Sales history with detailed views
// - Payment tracking
// - Responsive and accessible UI
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import "./Sales.css";

// ============================================================
// TYPES
// ============================================================

/**
 * Sale summary for list view
 */
type Sale = {
  id: string;
  customer_id: string | null;
  customer_name: string;
  sale_date: string;
  item_count: number;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  payment_method: string | null;
  status: "PAID" | "PARTIAL" | "UNPAID";
  notes: string | null;
};

/**
 * Customer for dropdown selection
 */
type Customer = {
  id: string;
  name: string;
};

/**
 * Product for sale items
 */
type Product = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
};

/**
 * Sale item in the form
 */
type SaleItem = {
  id: string;
  product_id: string;
  quantity: string;
};

/**
 * Sale detail item from API
 */
type SaleDetailItem = {
  id: string;
  product_id: string;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  total: number;
};

/**
 * Sale payment from API
 */
type SalePayment = {
  id: string;
  amount: number;
  payment_method: string;
  reference: string | null;
  payment_date: string;
};

/**
 * Complete sale detail from API
 */
type SaleDetail = {
  id: string;
  customer_id: string | null;
  sale_date: string;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  items: SaleDetailItem[];
  payments: SalePayment[];
};

// ============================================================
// CONSTANTS
// ============================================================

// Use environment variable for API URL with fallback
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3000";

// Payment methods
const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
] as const;

/**
 * Creates a new sale item with unique ID
 */
const createSaleItem = (): SaleItem => ({
  id: crypto.randomUUID(),
  product_id: "",
  quantity: "1",
});

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
 * Formats a timestamp to a readable date/time
 * @param date - ISO timestamp string
 * @returns Formatted date/time
 */
const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Gets the display name for a payment method
 */
const getPaymentMethodName = (method: string | null): string => {
  if (!method) return "—";
  const methods: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    card: "Card",
    bank_transfer: "Bank Transfer",
  };
  return methods[method.toLowerCase()] || method;
};

/**
 * Gets the CSS class for a status badge
 */
const getStatusBadgeClass = (status: string): string => {
  const classes: Record<string, string> = {
    PAID: "paid",
    PARTIAL: "partial",
    UNPAID: "unpaid",
  };
  return classes[status] || "unpaid";
};

// ============================================================
// MAIN COMPONENT
// ============================================================

function Sales() {
  // ==========================================================
  // STATE
  // ==========================================================

  // Data
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Form state
  const [items, setItems] = useState<SaleItem[]>([createSaleItem()]);
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  // Sale detail
  const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);

  // Error/Success
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================================
  // DATA FETCHING
  // ==========================================================

  /**
   * Loads all necessary data for sales
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [salesResponse, customersResponse, productsResponse] =
        await Promise.all([
          fetch(`${API_URL}/api/sales`),
          fetch(`${API_URL}/api/customers`),
          fetch(`${API_URL}/api/products`),
        ]);

      if (!salesResponse.ok) {
        let errorMessage = "Failed to load sales";
        try {
          const text = await salesResponse.text();
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

      if (!customersResponse.ok) {
        throw new Error("Failed to load customers");
      }

      if (!productsResponse.ok) {
        throw new Error("Failed to load products");
      }

      const salesData: Sale[] = await salesResponse.json();
      const customersData: Customer[] = await customersResponse.json();
      const productsData: Product[] = await productsResponse.json();

      setSales(salesData);
      setCustomers(customersData);
      setProducts(productsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load sales";
      setError(message);
      console.error("Sales data load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Loads detailed information for a specific sale
   */
  const loadSaleDetail = useCallback(async (saleId: string) => {
    try {
      setLoadingDetail(true);
      setError("");

      const response = await fetch(`${API_URL}/api/sales/${saleId}`);

      if (!response.ok) {
        let errorMessage = "Failed to load sale details";
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

      const detail: SaleDetail = await response.json();
      setSelectedSale(detail);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load sale details";
      setError(message);
      console.error("Sale detail load error:", err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // ==========================================================
  // EFFECTS
  // ==========================================================

  /**
   * Initial data loading on component mount
   */
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const [salesResponse, customersResponse, productsResponse] =
          await Promise.all([
            fetch(`${API_URL}/api/sales`),
            fetch(`${API_URL}/api/customers`),
            fetch(`${API_URL}/api/products`),
          ]);

        if (!salesResponse.ok) {
          throw new Error("Failed to load sales");
        }
        if (!customersResponse.ok) {
          throw new Error("Failed to load customers");
        }
        if (!productsResponse.ok) {
          throw new Error("Failed to load products");
        }

        const salesData: Sale[] = await salesResponse.json();
        const customersData: Customer[] = await customersResponse.json();
        const productsData: Product[] = await productsResponse.json();

        if (!cancelled) {
          setSales(salesData);
          setCustomers(customersData);
          setProducts(productsData);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load sales";
          setError(message);
          console.error("Sales data load error:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================================
  // COMPUTED VALUES
  // ==========================================================

  /**
   * Calculates the subtotal of all items in the sale
   */
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.product_id);
      const quantity = Number(item.quantity);

      if (!product || !Number.isInteger(quantity) || quantity <= 0) {
        return sum;
      }

      return sum + product.selling_price * quantity;
    }, 0);
  }, [items, products]);

  /**
   * Calculates the discount in paise
   */
  const discountPaise = useMemo(() => {
    const value = Number(discount);
    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }
    return Math.round(value * 100);
  }, [discount]);

  /**
   * Calculates the total after discount
   */
  const total = useMemo(() => {
    return Math.max(0, subtotal - discountPaise);
  }, [subtotal, discountPaise]);

  // ==========================================================
  // ITEM MANAGEMENT
  // ==========================================================

  /**
   * Updates a specific field in a sale item
   */
  const updateItem = useCallback((
    itemId: string,
    field: keyof Pick<SaleItem, "product_id" | "quantity">,
    value: string
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
    // Clear errors when user interacts
    setError("");
  }, []);

  /**
   * Adds a new empty item to the sale
   */
  const addItem = useCallback(() => {
    setItems((current) => [...current, createSaleItem()]);
    setError("");
  }, []);

  /**
   * Removes an item from the sale
   */
  const removeItem = useCallback((itemId: string) => {
    setItems((current) => {
      if (current.length === 1) {
        // Don't remove the last item, just clear it
        return current.map((item) =>
          item.id === itemId ? { ...item, product_id: "", quantity: "1" } : item
        );
      }
      return current.filter((item) => item.id !== itemId);
    });
    setError("");
  }, []);

  /**
   * Resets the entire form
   */
  const resetForm = useCallback(() => {
    setItems([createSaleItem()]);
    setCustomerId("");
    setDiscount("");
    setPaymentMethod("cash");
    setNotes("");
    setError("");
    setSuccess("");
  }, []);

  /**
   * Closes the sale detail view
   */
  const closeSaleDetail = useCallback(() => {
    setSelectedSale(null);
  }, []);

  // ==========================================================
  // SALE CREATION
  // ==========================================================

  /**
   * Creates a new sale
   * Validates all inputs before submitting
   */
  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    // Validate items
    if (items.length === 0) {
      setError("Add at least one product.");
      return;
    }

    // Check if all items have a product selected
    const validItems = items.filter((item) => item.product_id);
    if (validItems.length !== items.length) {
      setError("Please select a product for every sale item.");
      return;
    }

    // Combine quantities by product to check stock
    const requestedQuantities = new Map<string, number>();

    for (const item of items) {
      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        setError("Quantity must be a whole number greater than zero.");
        return;
      }

      const currentQuantity = requestedQuantities.get(item.product_id) ?? 0;
      requestedQuantities.set(item.product_id, currentQuantity + quantity);
    }

    // Validate stock for each product
    for (const [productId, requestedQuantity] of requestedQuantities) {
      const product = products.find((p) => p.id === productId);

      if (!product) {
        setError("Selected product could not be found.");
        return;
      }

      if (requestedQuantity > product.stock_quantity) {
        setError(
          `${product.name} has only ${product.stock_quantity} item(s) in stock, but ${requestedQuantity} requested.`
        );
        return;
      }
    }

    // Validate discount
    if (discountPaise > subtotal) {
      setError("Discount cannot be greater than the subtotal.");
      return;
    }

    // Validate total
    if (total <= 0) {
      setError("Sale total must be greater than zero.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${API_URL}/api/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: customerId || null,
          items: items.map((item) => ({
            product_id: item.product_id,
            quantity: Number(item.quantity),
          })),
          discount: discountPaise,
          payment: {
            amount: total,
            payment_method: paymentMethod,
            reference: null,
          },
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        let errorMessage = await response.text();
        try {
          const parsed = JSON.parse(errorMessage);
          errorMessage = typeof parsed === 'string' ? parsed : parsed.message || errorMessage;
        } catch {
          // Keep the original text
        }
        throw new Error(errorMessage || "Failed to create sale.");
      }

      resetForm();
      setSuccess("Sale created successfully.");

      // Reload sales data to show the new sale
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create sale.";
      setError(message);
      console.error("Sale creation error:", err);
    } finally {
      setSaving(false);
    }
  }, [items, products, customerId, discountPaise, subtotal, total, paymentMethod, notes, resetForm, loadData]);

  // ==========================================================
  // RENDER HELPERS
  // ==========================================================

  /**
   * Loading state renderer
   */
  if (loading) {
    return (
      <div className="sales-page">
        <div className="loading" role="status" aria-label="Loading sales">
          Loading sales...
        </div>
      </div>
    );
  }

  // ==========================================================
  // MAIN RENDER
  // ==========================================================

  return (
    <div className="sales-page" role="main" aria-label="Sales Management">

      {/* ==========================================================
          HEADER
          ========================================================== */}
      <header className="page-header" aria-label="Sales header">
        <div>
          <h2>Sales</h2>
          <p>Create new sales and manage your complete sales history.</p>
        </div>

        <button
          className="refresh-button"
          onClick={() => void loadData()}
          disabled={loading || saving}
          aria-label="Refresh sales data"
        >
          Refresh
        </button>
      </header>

      {/* ==========================================================
          STATUS MESSAGES
          ========================================================== */}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="success" role="status">
          {success}
        </div>
      )}

      {/* ==========================================================
          NEW SALE + SUMMARY
          ========================================================== */}
      <div className="sales-layout">
        {/* New Sale Form */}
        <section className="card" aria-label="New sale form">
          <div className="card-header">
            <div>
              <h3>New Sale</h3>
              <p>Create a new customer sale.</p>
            </div>
          </div>

          <form className="sale-form" onSubmit={handleSubmit} noValidate>
            {/* Customer Selection */}
            <div className="form-group">
              <label htmlFor="customer">Customer</label>
              <select
                id="customer"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                disabled={saving}
              >
                <option value="">Walk-in Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sale Items */}
            <div className="sale-items-header">
              <div>
                <h4>Items</h4>
                <span>Select products and quantities.</span>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={addItem}
                disabled={saving}
              >
                + Add Item
              </button>
            </div>

            <div className="sales-items">
              {items.map((item, index) => {
                const product = products.find((p) => p.id === item.product_id);
                const quantity = Number(item.quantity) || 0;
                const itemTotal = product ? product.selling_price * quantity : 0;

                return (
                  <div className="sale-item" key={item.id}>
                    <div className="sale-item-header">
                      <strong>Item {index + 1}</strong>

                      <button
                        type="button"
                        className="remove-item-button"
                        onClick={() => removeItem(item.id)}
                        disabled={saving}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="sale-item-grid">
                      {/* Product Selection */}
                      <div className="form-group">
                        <label htmlFor={`product-${item.id}`}>
                          Product <span className="required">*</span>
                        </label>
                        <select
                          id={`product-${item.id}`}
                          value={item.product_id}
                          onChange={(event) =>
                            updateItem(item.id, "product_id", event.target.value)
                          }
                          disabled={saving}
                          required
                          aria-required="true"
                        >
                          <option value="">Select product</option>
                          {products.map((product) => (
                            <option
                              key={product.id}
                              value={product.id}
                              disabled={product.stock_quantity <= 0}
                            >
                              {product.name} — {formatMoney(product.selling_price)} (
                              {product.stock_quantity} in stock)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="form-group">
                        <label htmlFor={`quantity-${item.id}`}>
                          Quantity <span className="required">*</span>
                        </label>
                        <input
                          id={`quantity-${item.id}`}
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(item.id, "quantity", event.target.value)
                          }
                          disabled={saving}
                          required
                          aria-required="true"
                        />
                      </div>

                      {/* Unit Price (Read-only) */}
                      <div className="form-group">
                        <label>Unit Price</label>
                        <div className={`readonly-field ${!product ? "empty" : ""}`}>
                          {product ? formatMoney(product.selling_price) : "—"}
                        </div>
                      </div>
                    </div>

                    {/* Stock Info */}
                    {product && (
                      <div className="sale-item-stock">
                        Stock available: <strong>{product.stock_quantity}</strong>
                      </div>
                    )}

                    {/* Item Total */}
                    <div className="sale-item-total">
                      <span>Item Total</span>
                      <strong>{formatMoney(itemTotal)}</strong>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Discount and Payment Method */}
            <div className="sale-form-grid">
              <div className="form-group">
                <label htmlFor="discount">Discount (₹)</label>
                <input
                  id="discount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  disabled={saving}
                  aria-describedby="discount-help"
                />
                <small id="discount-help">Enter discount in rupees.</small>
              </div>

              <div className="form-group">
                <label htmlFor="payment-method">Payment Method</label>
                <select
                  id="payment-method"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  disabled={saving}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                rows={3}
                placeholder="Optional sale notes..."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={saving}
              />
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
                disabled={saving}
              >
                Clear
              </button>

              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Complete Sale"}
              </button>
            </div>
          </form>
        </section>

        {/* Sale Summary */}
        <section className="card sale-summary" aria-label="Sale summary">
          <div className="card-header">
            <div>
              <h3>Sale Summary</h3>
              <p>Current transaction</p>
            </div>
          </div>

          <div className="sale-summary-content">
            <div className="sale-summary-row">
              <span>Subtotal</span>
              <strong>{formatMoney(subtotal)}</strong>
            </div>

            <div className="sale-summary-row">
              <span>Discount</span>
              <strong>{formatMoney(discountPaise)}</strong>
            </div>

            <div className="sale-summary-row">
              <span>Total</span>
              <strong className="sale-total">{formatMoney(total)}</strong>
            </div>
          </div>

          <div className="sale-summary-payment">
            <span>Payment</span>
            <strong>{getPaymentMethodName(paymentMethod)}</strong>
          </div>
        </section>
      </div>

      {/* ==========================================================
          SALES HISTORY
          ========================================================== */}
      <section className="card" aria-label="Sales history">
        <div className="card-header">
          <div>
            <h3>Sales History</h3>
            <p>
              {sales.length} sale{sales.length !== 1 ? "s" : ""} recorded.
            </p>
          </div>
        </div>

        {sales.length === 0 ? (
          <div className="empty-state" role="status">
            <strong>No sales yet</strong>
            <span>Create your first sale using the form above.</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table aria-label="Sales history table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Items</th>
                  <th scope="col">Subtotal</th>
                  <th scope="col">Discount</th>
                  <th scope="col">Total</th>
                  <th scope="col">Paid</th>
                  <th scope="col">Payment</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>

              <tbody>
                {sales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="sale-history-row"
                    onClick={() => void loadSaleDetail(sale.id)}
                  >
                    <td>{formatDateTime(sale.sale_date)}</td>
                    <td>
                      <strong>{sale.customer_name}</strong>
                    </td>
                    <td>{sale.item_count}</td>
                    <td>{formatMoney(sale.subtotal)}</td>
                    <td>{sale.discount > 0 ? formatMoney(sale.discount) : "—"}</td>
                    <td>
                      <strong>{formatMoney(sale.total)}</strong>
                    </td>
                    <td>{formatMoney(sale.paid)}</td>
                    <td>{getPaymentMethodName(sale.payment_method)}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(sale.status)}`}>
                        {sale.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void loadSaleDetail(sale.id);
                        }}
                        disabled={loadingDetail}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ==========================================================
          SALE DETAILS
          ========================================================== */}
      {selectedSale && (
        <section className="card" aria-label="Sale details">
          <div className="card-header">
            <div>
              <h3>Sale Details</h3>
              <p>{formatDateTime(selectedSale.sale_date)}</p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={closeSaleDetail}
            >
              Close
            </button>
          </div>

          {/* Sale Items */}
          <div className="table-wrapper">
            <table aria-label="Sale items table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">SKU</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Unit Price</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>

              <tbody>
                {selectedSale.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.product_name}</strong>
                    </td>
                    <td>{item.sku || "—"}</td>
                    <td>{item.quantity}</td>
                    <td>{formatMoney(item.unit_price)}</td>
                    <td>
                      <strong>{formatMoney(item.total)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sale Totals */}
          <div className="sale-summary-content">
            <div className="sale-summary-row">
              <span>Subtotal</span>
              <strong>{formatMoney(selectedSale.subtotal)}</strong>
            </div>

            <div className="sale-summary-row">
              <span>Discount</span>
              <strong>{formatMoney(selectedSale.discount)}</strong>
            </div>

            <div className="sale-summary-row">
              <span>Total</span>
              <strong className="sale-total">{formatMoney(selectedSale.total)}</strong>
            </div>
          </div>

          {/* Payments */}
          <div className="sale-detail-payment">
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                Payments
              </span>
            </div>

            {selectedSale.payments.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '8px 0' }}>
                No payment recorded
              </div>
            ) : (
              selectedSale.payments.map((payment) => (
                <div className="payment-item" key={payment.id}>
                  <span>{getPaymentMethodName(payment.payment_method)}</span>
                  <strong>{formatMoney(payment.amount)}</strong>
                  {payment.reference && (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      Ref: {payment.reference}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Notes */}
          {selectedSale.notes && (
            <div style={{ padding: '0 20px 20px' }}>
              <div className="form-group">
                <label>Notes</label>
                <div className="readonly-field">{selectedSale.notes}</div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Loading detail overlay */}
      {loadingDetail && (
        <section className="card">
          <div className="loading" role="status">
            Loading sale details...
          </div>
        </section>
      )}
    </div>
  );
}

export default Sales;
