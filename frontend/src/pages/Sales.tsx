import { useEffect, useMemo, useState } from "react";

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

type Customer = {
  id: string;
  name: string;
};

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

type SaleItem = {
  id: string;
  product_id: string;
  quantity: string;
};

type SaleDetailItem = {
  id: string;
  product_id: string;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  total: number;
};

type SalePayment = {
  id: string;
  amount: number;
  payment_method: string;
  reference: string | null;
  payment_date: string;
};

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

const API_URL = "http://127.0.0.1:3000";

const createItem = (): SaleItem => ({
  id: crypto.randomUUID(),
  product_id: "",
  quantity: "1",
});

function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [items, setItems] = useState<SaleItem[]>([createItem()]);
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  const [selectedSale, setSelectedSale] =
    useState<SaleDetail | null>(null);

  const [loadingDetail, setLoadingDetail] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        salesResponse,
        customersResponse,
        productsResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/api/sales`),
        fetch(`${API_URL}/api/customers`),
        fetch(`${API_URL}/api/products`),
      ]);

      if (!salesResponse.ok) {
        throw new Error("Failed to load sales.");
      }

      if (!customersResponse.ok) {
        throw new Error("Failed to load customers.");
      }

      if (!productsResponse.ok) {
        throw new Error("Failed to load products.");
      }

      const salesData: Sale[] =
        await salesResponse.json();

      const customersData: Customer[] =
        await customersResponse.json();

      const productsData: Product[] =
        await productsResponse.json();

      setSales(salesData);
      setCustomers(customersData);
      setProducts(productsData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load sales.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // ==========================================================
  // FORM HELPERS
  // ==========================================================

  const formatMoney = (amount: number) => {
    return `₹${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPaymentMethodName = (method: string | null) => {
    if (!method) {
      return "—";
    }

    switch (method) {
      case "bank_transfer":
        return "Bank Transfer";

      case "upi":
        return "UPI";

      case "card":
        return "Card";

      case "cash":
        return "Cash";

      default:
        return method;
    }
  };

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const product = products.find(
        (currentProduct) =>
          currentProduct.id === item.product_id,
      );

      const quantity = Number(item.quantity);

      if (
        !product ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return sum;
      }

      return (
        sum +
        product.selling_price * quantity
      );
    }, 0);
  }, [items, products]);

  const discountPaise = useMemo(() => {
    const value = Number(discount);

    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }

    return Math.round(value * 100);
  }, [discount]);

  const total = Math.max(
    0,
    subtotal - discountPaise,
  );

  // ==========================================================
  // ITEM MANAGEMENT
  // ==========================================================

  const updateItem = (
    itemId: string,
    field: "product_id" | "quantity",
    value: string,
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
            ...item,
            [field]: value,
          }
          : item,
      ),
    );
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      createItem(),
    ]);
  };

  const removeItem = (itemId: string) => {
    setItems((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter(
        (item) => item.id !== itemId,
      );
    });
  };

  const resetForm = () => {
    setItems([createItem()]);
    setCustomerId("");
    setDiscount("");
    setPaymentMethod("cash");
    setNotes("");
  };

  // ==========================================================
  // OPEN SALE DETAILS
  // ==========================================================

  const openSale = async (saleId: string) => {
    try {
      setLoadingDetail(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/sales/${saleId}`,
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message || "Failed to load sale details.",
        );
      }

      const detail: SaleDetail =
        await response.json();

      setSelectedSale(detail);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load sale details.",
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeSale = () => {
    setSelectedSale(null);
  };

  // ==========================================================
  // CREATE SALE
  // ==========================================================

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (items.length === 0) {
      setError("Add at least one product.");
      return;
    }

    const validItems = items.filter(
      (item) => item.product_id,
    );

    if (validItems.length !== items.length) {
      setError(
        "Please select a product for every sale item.",
      );
      return;
    }

    for (const item of items) {
      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        setError(
          "Quantity must be a whole number greater than zero.",
        );
        return;
      }

      const product = products.find(
        (currentProduct) =>
          currentProduct.id === item.product_id,
      );

      if (!product) {
        setError(
          "Selected product could not be found.",
        );
        return;
      }

      if (
        quantity >
        product.stock_quantity
      ) {
        setError(
          `${product.name} has only ${product.stock_quantity} item(s) in stock.`,
        );
        return;
      }
    }

    if (discountPaise > subtotal) {
      setError(
        "Discount cannot be greater than the subtotal.",
      );
      return;
    }

    if (total <= 0) {
      setError(
        "Sale total must be greater than zero.",
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `${API_URL}/api/sales`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer_id:
              customerId || null,

            items: items.map((item) => ({
              product_id: item.product_id,
              quantity: Number(item.quantity),
            })),

            discount: discountPaise,

            payment: {
              amount: total,
              payment_method:
                paymentMethod,
              reference: null,
            },

            notes:
              notes.trim() || null,
          }),
        },
      );

      if (!response.ok) {
        const message =
          await response.text();

        throw new Error(
          message || "Failed to create sale.",
        );
      }

      resetForm();

      setSuccess(
        "Sale created successfully.",
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create sale.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="loading">
        Loading sales...
      </div>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Sales</h2>

          <p>
            Create new sales and manage
            your complete sales history.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={() => void loadData()}
          disabled={loading || saving}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {success && (
        <div className="success">
          {success}
        </div>
      )}

      {/* ======================================================
          NEW SALE
      ====================================================== */}

      <div className="sales-layout">
        <section className="card">
          <div className="card-header">
            <div>
              <h3>New Sale</h3>

              <p>
                Create a new customer sale.
              </p>
            </div>
          </div>

          <form
            className="sale-form"
            onSubmit={handleSubmit}
          >
            <div className="form-group">
              <label htmlFor="customer">
                Customer
              </label>

              <select
                id="customer"
                value={customerId}
                onChange={(event) =>
                  setCustomerId(
                    event.target.value,
                  )
                }
                disabled={saving}
              >
                <option value="">
                  Walk-in Customer
                </option>

                {customers.map(
                  (customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="sale-items-header">
              <div>
                <h4>Items</h4>

                <span>
                  Select products and
                  quantities.
                </span>
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
              {items.map(
                (item, index) => {
                  const product =
                    products.find(
                      (currentProduct) =>
                        currentProduct.id ===
                        item.product_id,
                    );

                  const quantity =
                    Number(item.quantity) || 0;

                  const itemTotal =
                    product
                      ? product.selling_price *
                      quantity
                      : 0;

                  return (
                    <div
                      className="sale-item"
                      key={item.id}
                    >
                      <div className="sale-item-header">
                        <strong>
                          Item {index + 1}
                        </strong>

                        {items.length >
                          1 && (
                            <button
                              type="button"
                              className="remove-item-button"
                              onClick={() =>
                                removeItem(
                                  item.id,
                                )
                              }
                              disabled={saving}
                            >
                              Remove
                            </button>
                          )}
                      </div>

                      <div className="sale-item-grid">
                        <div className="form-group">
                          <label
                            htmlFor={`product-${item.id}`}
                          >
                            Product
                          </label>

                          <select
                            id={`product-${item.id}`}
                            value={
                              item.product_id
                            }
                            onChange={(
                              event,
                            ) =>
                              updateItem(
                                item.id,
                                "product_id",
                                event.target
                                  .value,
                              )
                            }
                            disabled={saving}
                          >
                            <option value="">
                              Select product
                            </option>

                            {products.map(
                              (
                                currentProduct,
                              ) => (
                                <option
                                  key={
                                    currentProduct.id
                                  }
                                  value={
                                    currentProduct.id
                                  }
                                  disabled={
                                    currentProduct.stock_quantity <=
                                    0
                                  }
                                >
                                  {
                                    currentProduct.name
                                  }{" "}
                                  —{" "}
                                  {formatMoney(
                                    currentProduct.selling_price,
                                  )}{" "}
                                  (
                                  {
                                    currentProduct.stock_quantity
                                  }{" "}
                                  in stock)
                                </option>
                              ),
                            )}
                          </select>
                        </div>

                        <div className="form-group">
                          <label
                            htmlFor={`quantity-${item.id}`}
                          >
                            Quantity
                          </label>

                          <input
                            id={`quantity-${item.id}`}
                            type="number"
                            min="1"
                            step="1"
                            value={
                              item.quantity
                            }
                            onChange={(
                              event,
                            ) =>
                              updateItem(
                                item.id,
                                "quantity",
                                event.target
                                  .value,
                              )
                            }
                            disabled={saving}
                          />
                        </div>

                        <div className="form-group">
                          <label>
                            Unit Price
                          </label>

                          <div className="readonly-field">
                            {product
                              ? formatMoney(
                                product.selling_price,
                              )
                              : "—"}
                          </div>
                        </div>
                      </div>

                      {product && (
                        <div className="sale-item-stock">
                          Stock available:{" "}
                          <strong>
                            {
                              product.stock_quantity
                            }
                          </strong>
                        </div>
                      )}

                      <div className="sale-item-total">
                        <span>
                          Item Total
                        </span>

                        <strong>
                          {formatMoney(
                            itemTotal,
                          )}
                        </strong>
                      </div>
                    </div>
                  );
                },
              )}
            </div>

            <div className="sale-form-grid">
              <div className="form-group">
                <label htmlFor="discount">
                  Discount
                </label>

                <input
                  id="discount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={discount}
                  onChange={(event) =>
                    setDiscount(
                      event.target.value,
                    )
                  }
                  disabled={saving}
                />

                <small>
                  Enter discount in rupees.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="payment-method">
                  Payment Method
                </label>

                <select
                  id="payment-method"
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(
                      event.target.value,
                    )
                  }
                  disabled={saving}
                >
                  <option value="cash">
                    Cash
                  </option>

                  <option value="upi">
                    UPI
                  </option>

                  <option value="card">
                    Card
                  </option>

                  <option value="bank_transfer">
                    Bank Transfer
                  </option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="notes">
                Notes
              </label>

              <textarea
                id="notes"
                rows={3}
                placeholder="Optional sale notes..."
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value,
                  )
                }
                disabled={saving}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
                disabled={saving}
              >
                Clear
              </button>

              <button
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Complete Sale"}
              </button>
            </div>
          </form>
        </section>

        {/* ==================================================
            CURRENT SALE SUMMARY
        ================================================== */}

        <section className="card sale-summary">
          <div className="card-header">
            <div>
              <h3>Sale Summary</h3>

              <p>
                Current transaction
              </p>
            </div>
          </div>

          <div className="sale-summary-content">
            <div className="sale-summary-row">
              <span>Subtotal</span>

              <strong>
                {formatMoney(subtotal)}
              </strong>
            </div>

            <div className="sale-summary-row">
              <span>Discount</span>

              <strong>
                {formatMoney(
                  discountPaise,
                )}
              </strong>
            </div>

            <div className="sale-summary-row">
              <span>Total</span>

              <strong className="sale-total">
                {formatMoney(total)}
              </strong>
            </div>

            <div className="sale-summary-payment">
              <span>Payment</span>

              <strong>
                {getPaymentMethodName(
                  paymentMethod,
                )}
              </strong>
            </div>
          </div>
        </section>
      </div>

      {/* ======================================================
          SALES HISTORY
      ====================================================== */}

      <section className="card">
        <div className="card-header">
          <div>
            <h3>Sales History</h3>

            <p>
              {sales.length} sale
              {sales.length !== 1
                ? "s"
                : ""}{" "}
              recorded.
            </p>
          </div>
        </div>

        {sales.length === 0 ? (
          <div className="empty-state">
            No sales recorded yet.
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Subtotal</th>
                  <th>Discount</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {sales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="sale-history-row"
                    onClick={() =>
                      void openSale(
                        sale.id,
                      )
                    }
                  >
                    <td>
                      {formatDate(
                        sale.sale_date,
                      )}
                    </td>

                    <td>
                      <strong>
                        {
                          sale.customer_name
                        }
                      </strong>
                    </td>

                    <td>
                      {sale.item_count}
                    </td>

                    <td>
                      {formatMoney(
                        sale.subtotal,
                      )}
                    </td>

                    <td>
                      {sale.discount > 0
                        ? formatMoney(
                          sale.discount,
                        )
                        : "—"}
                    </td>

                    <td>
                      <strong>
                        {formatMoney(
                          sale.total,
                        )}
                      </strong>
                    </td>

                    <td>
                      {formatMoney(
                        sale.paid,
                      )}
                    </td>

                    <td>
                      {getPaymentMethodName(
                        sale.payment_method,
                      )}
                    </td>

                    <td>
                      <strong>
                        {sale.status}
                      </strong>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={(event) => {
                          event.stopPropagation();

                          void openSale(
                            sale.id,
                          );
                        }}
                        disabled={
                          loadingDetail
                        }
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

      {/* ======================================================
          SALE DETAILS
      ====================================================== */}

      {selectedSale && (
        <section className="card">
          <div className="card-header">
            <div>
              <h3>Sale Details</h3>

              <p>
                {formatDate(
                  selectedSale.sale_date,
                )}
              </p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={closeSale}
            >
              Close
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {selectedSale.items.map(
                  (item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>
                          {
                            item.product_name
                          }
                        </strong>
                      </td>

                      <td>
                        {item.sku || "—"}
                      </td>

                      <td>
                        {item.quantity}
                      </td>

                      <td>
                        {formatMoney(
                          item.unit_price,
                        )}
                      </td>

                      <td>
                        <strong>
                          {formatMoney(
                            item.total,
                          )}
                        </strong>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          <div className="sale-summary-content">
            <div className="sale-summary-row">
              <span>Subtotal</span>

              <strong>
                {formatMoney(
                  selectedSale.subtotal,
                )}
              </strong>
            </div>

            <div className="sale-summary-row">
              <span>Discount</span>

              <strong>
                {formatMoney(
                  selectedSale.discount,
                )}
              </strong>
            </div>

            <div className="sale-summary-row">
              <span>Total</span>

              <strong className="sale-total">
                {formatMoney(
                  selectedSale.total,
                )}
              </strong>
            </div>
          </div>

          <div className="sale-summary-payment">
            <span>Payment</span>

            {selectedSale.payments
              .length === 0 ? (
              <strong>
                No payment recorded
              </strong>
            ) : (
              <div>
                {selectedSale.payments.map(
                  (payment) => (
                    <div
                      key={payment.id}
                    >
                      <strong>
                        {getPaymentMethodName(
                          payment.payment_method,
                        )}
                      </strong>{" "}
                      —{" "}
                      {formatMoney(
                        payment.amount,
                      )}
                      {payment.reference
                        ? ` · Ref: ${payment.reference}`
                        : ""}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          {selectedSale.notes && (
            <div className="form-group">
              <label>Notes</label>

              <div className="readonly-field">
                {selectedSale.notes}
              </div>
            </div>
          )}
        </section>
      )}

      {loadingDetail && (
        <div className="loading">
          Loading sale details...
        </div>
      )}
    </>
  );
}

export default Sales;
