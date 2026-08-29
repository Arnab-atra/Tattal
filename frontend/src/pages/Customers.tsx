// ============================================================
// Customers.tsx
// 
// A comprehensive customer management component that provides:
// - Customer list with search functionality
// - Create, read, update, and delete customer operations
// - Customer detail view with purchase history
// - Outstanding balance tracking
// - Responsive and accessible UI
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import "./Customers.css";

// ============================================================
// TYPES
// ============================================================

/**
 * Basic customer information
 */
type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Customer sale record
 */
type CustomerSale = {
  id: string;
  sale_date: string;
  total: number;
  paid: number;
  payment_method: string | null;
};

/**
 * Complete customer detail including sales history
 */
type CustomerDetail = Customer & {
  sales_count: number;
  total_purchases: number;
  total_paid: number;
  sales: CustomerSale[];
};

// ============================================================
// CONSTANTS
// ============================================================

// Use environment variable for API URL with fallback
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3000";

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Formats a monetary value in Indian Rupees (₹)
 * @param amount - Value in paise (1/100 of a rupee)
 * @returns Formatted currency string with trailing space
 */
const formatMoney = (amount: number): string => {
  return `₹${(amount / 100).toFixed(2)} `;
};

/**
 * Formats a timestamp to a readable date/time
 * @param date - ISO timestamp string
 * @returns Formatted date/time (e.g., "29 Aug, 2024, 14:30")
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
 * @param method - Payment method code
 * @returns Human-readable payment method name
 */
const getPaymentMethodName = (method: string | null): string => {
  if (!method) {
    return "—";
  }

  const methods: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    card: "Card",
    bank_transfer: "Bank Transfer",
  };

  return methods[method.toLowerCase()] || method;
};

// ============================================================
// MAIN COMPONENT
// ============================================================

function Customers() {
  // ==========================================================
  // STATE
  // ==========================================================

  // Customer data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);

  // UI state
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Error/Success states
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================================
  // DATA FETCHING
  // ==========================================================

  /**
   * Fetches the complete list of customers
   */
  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_URL}/api/customers`);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: Failed to load customers`;
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

      const data: Customer[] = await response.json();
      setCustomers(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load customers";
      setError(message);
      console.error("Customers fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetches detailed information for a specific customer
   * Includes purchase history and financial summary
   */
  const loadCustomerDetail = useCallback(async (customerId: string) => {
    try {
      setLoadingDetail(true);
      setError("");

      const response = await fetch(`${API_URL}/api/customers/${customerId}`);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: Failed to load customer details`;
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

      const data: CustomerDetail = await response.json();
      setSelectedCustomer(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load customer details";
      setError(message);
      console.error("Customer detail fetch error:", err);
    } finally {
      setLoadingDetail(false);
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

    const fetchCustomers = async () => {
      try {
        setLoading(true);
        setError("");

        // FIXED: Corrected API endpoint from "coustomers" to "customers"
        const response = await fetch(`${API_URL}/api/customers`);

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: Failed to load customers`;
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

        const data: Customer[] = await response.json();

        if (!cancelled) {
          setCustomers(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load customers";
          setError(message);
          console.error("Customers fetch error:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchCustomers();

    return () => {
      cancelled = true;
    };
  }, []); // Empty dependency array = run once on mount

  // ==========================================================
  // FORM MANAGEMENT
  // ==========================================================

  /**
   * Resets the customer form to empty state
   * Clears all fields and editing state
   */
  const resetCustomerForm = useCallback(() => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerNotes("");
    setEditingCustomerId(null);
    setError("");
    setSuccess("");
  }, []);

  /**
   * Opens the form to edit an existing customer
   * Populates form fields with customer data
   */
  const startEditCustomer = useCallback((customer: Customer) => {
    setEditingCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone ?? "");
    setCustomerEmail(customer.email ?? "");
    setCustomerNotes(customer.notes ?? "");
    setShowCreateForm(true);
    setError("");
    setSuccess("");

    // Scroll to top for better UX on mobile
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  /**
   * Closes the customer detail view
   */
  const closeCustomerDetail = useCallback(() => {
    setSelectedCustomer(null);
  }, []);

  // ==========================================================
  // CRUD OPERATIONS
  // ==========================================================

  /**
   * Creates a new customer or updates an existing one
   * Handles both POST (create) and PUT (update) operations
   */
  const saveCustomer = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Validate required fields
    const name = customerName.trim();
    if (!name) {
      setError("Customer name is required.");
      return;
    }

    // Validate phone number format (optional)
    const phone = customerPhone.trim();
    if (phone && !/^[0-9+\-\s()]{7,15}$/.test(phone)) {
      setError("Please enter a valid phone number (7-15 digits).");
      return;
    }

    // Validate email format (optional)
    const email = customerEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setSavingCustomer(true);
      setError("");
      setSuccess("");

      const isEditing = Boolean(editingCustomerId);
      const endpoint = isEditing
        ? `${API_URL}/api/customers/${editingCustomerId}`
        : `${API_URL}/api/customers`;

      const response = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone: phone || null,
          email: email || null,
          notes: customerNotes.trim() || null,
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
        throw new Error(errorMessage || (isEditing ? "Failed to update customer" : "Failed to create customer"));
      }

      const customer: Customer = await response.json();

      if (isEditing) {
        // Update customer in the list
        setCustomers((current) =>
          current.map((item) => (item.id === customer.id ? customer : item))
        );

        // If the customer is currently selected, update the detail view
        if (selectedCustomer?.id === customer.id) {
          await loadCustomerDetail(customer.id);
        }

        setSuccess("Customer updated successfully.");
      } else {
        // Add new customer to the list
        setCustomers((current) => [customer, ...current]);
        setSuccess("Customer created successfully.");
      }

      // Close form and reset
      setShowCreateForm(false);
      resetCustomerForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Operation failed";
      setError(message);
      console.error("Customer save error:", err);
    } finally {
      setSavingCustomer(false);
    }
  }, [
    customerName,
    customerPhone,
    customerEmail,
    customerNotes,
    editingCustomerId,
    selectedCustomer,
    loadCustomerDetail,
    resetCustomerForm,
  ]);

  // ==========================================================
  // COMPUTED VALUES
  // ==========================================================

  /**
   * Filters customers based on search input
   * Searches across name, phone, and email fields
   */
  const filteredCustomers = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    if (!searchTerm) {
      return customers;
    }

    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(searchTerm) ||
        customer.phone?.toLowerCase().includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchTerm)
      );
    });
  }, [customers, search]);

  // ==========================================================
  // RENDER HELPERS
  // ==========================================================

  /**
   * Loading state renderer
   */
  if (loading) {
    return (
      <div className="customers-page">
        <div className="loading" role="status" aria-label="Loading customers">
          Loading customers...
        </div>
      </div>
    );
  }

  // ==========================================================
  // MAIN RENDER
  // ==========================================================

  return (
    <div className="customers-page" role="main" aria-label="Customer Management">

      {/* ==========================================================
          HEADER
          ========================================================== */}
      <header className="page-header" aria-label="Customer management header">
        <div>
          <h2>Customers</h2>
          <p>Manage customers and view purchase history</p>
        </div>

        <div className="page-header-actions">
          <button
            className={showCreateForm ? "secondary-button" : "primary-button"}
            onClick={() => {
              setShowCreateForm((current) => !current);
              setError("");
              setSuccess("");

              if (!showCreateForm) {
                // Opening the form - reset to empty state
                resetCustomerForm();
              }
            }}
            disabled={savingCustomer}
            aria-expanded={showCreateForm}
          >
            {showCreateForm ? "Cancel" : "+ Add Customer"}
          </button>

          <button
            className="refresh-button"
            onClick={() => void loadCustomers()}
            disabled={loading || savingCustomer}
            aria-label="Refresh customer list"
          >
            Refresh
          </button>
        </div>
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
          CREATE/EDIT CUSTOMER FORM
          ========================================================== */}
      {showCreateForm && (
        <section className="card customer-create-card" aria-label="Customer form">
          <div className="card-header">
            <div>
              <h3>{editingCustomerId ? "Edit Customer" : "Add Customer"}</h3>
              <p>
                {editingCustomerId
                  ? "Update customer information"
                  : "Create a new customer record"}
              </p>
            </div>
          </div>

          <form onSubmit={saveCustomer} className="customer-form" noValidate>
            <div className="customer-form-grid">
              {/* Name - Required */}
              <div className="form-group">
                <label htmlFor="customer-name">
                  Name <span className="required">*</span>
                </label>
                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Customer name"
                  disabled={savingCustomer}
                  required
                  autoFocus
                  aria-required="true"
                />
              </div>

              {/* Phone - Optional */}
              <div className="form-group">
                <label htmlFor="customer-phone">Phone</label>
                <input
                  id="customer-phone"
                  type="tel"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="Phone number"
                  disabled={savingCustomer}
                  aria-describedby="phone-help"
                />
                <small id="phone-help">Optional. 7-15 digits.</small>
              </div>

              {/* Email - Optional */}
              <div className="form-group">
                <label htmlFor="customer-email">Email</label>
                <input
                  id="customer-email"
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="Email address"
                  disabled={savingCustomer}
                  aria-describedby="email-help"
                />
                <small id="email-help">Optional. Valid email format.</small>
              </div>
            </div>

            {/* Notes - Optional */}
            <div className="form-group">
              <label htmlFor="customer-notes">Notes</label>
              <textarea
                id="customer-notes"
                rows={3}
                value={customerNotes}
                onChange={(event) => setCustomerNotes(event.target.value)}
                placeholder="Optional customer notes..."
                disabled={savingCustomer}
              />
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setShowCreateForm(false);
                  resetCustomerForm();
                }}
                disabled={savingCustomer}
              >
                Cancel
              </button>

              <button type="submit" disabled={savingCustomer}>
                {savingCustomer
                  ? "Saving..."
                  : editingCustomerId
                    ? "Update Customer"
                    : "Save Customer"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ==========================================================
          CUSTOMER LIST
          ========================================================== */}
      <section className="card" aria-label="Customer list">
        <div className="card-header">
          <div>
            <h3>Customer List</h3>
            <p>
              {customers.length} customer
              {customers.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="customer-search">
            <input
              type="search"
              placeholder="Search customers..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search customers by name, phone, or email"
            />
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="empty-state" role="status">
            {search ? (
              <>
                <strong>No results found</strong>
                <span>No customers match your search criteria.</span>
              </>
            ) : (
              <>
                <strong>No customers yet</strong>
                <span>Add your first customer using the form above.</span>
              </>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table aria-label="Customer list table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Email</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <strong>{customer.name}</strong>
                    </td>
                    <td>{customer.phone || "—"}</td>
                    <td>{customer.email || "—"}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="secondary-button"
                          onClick={() => loadCustomerDetail(customer.id)}
                          aria-label={`View ${customer.name} details`}
                        >
                          View
                        </button>

                        <button
                          className="secondary-button"
                          onClick={() => startEditCustomer(customer)}
                          disabled={savingCustomer}
                          aria-label={`Edit ${customer.name}`}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ==========================================================
          LOADING DETAIL INDICATOR
          ========================================================== */}
      {loadingDetail && (
        <section className="card" aria-label="Loading customer details">
          <div className="loading" role="status">
            Loading customer details...
          </div>
        </section>
      )}

      {/* ==========================================================
          CUSTOMER DETAIL VIEW
          ========================================================== */}
      {selectedCustomer && !loadingDetail && (
        <section className="card customer-detail-card" aria-label="Customer details">
          <div className="card-header">
            <div>
              <h3>{selectedCustomer.name}</h3>
              <p>Customer details and purchase history</p>
            </div>

            <button
              className="secondary-button"
              onClick={closeCustomerDetail}
              aria-label="Close customer details"
            >
              Close
            </button>
          </div>

          {/* Customer Information Grid */}
          <div className="customer-info-grid">
            <div>
              <span>Phone</span>
              <strong>{selectedCustomer.phone || "—"}</strong>
            </div>

            <div>
              <span>Email</span>
              <strong>{selectedCustomer.email || "—"}</strong>
            </div>

            <div>
              <span>Total Sales</span>
              <strong>{selectedCustomer.sales_count}</strong>
            </div>

            <div>
              <span>Total Purchases</span>
              <strong>{formatMoney(selectedCustomer.total_purchases)}</strong>
            </div>

            <div>
              <span>Total Paid</span>
              <strong>{formatMoney(selectedCustomer.total_paid)}</strong>
            </div>

            <div>
              <span>Outstanding Balance</span>
              <strong
                className={
                  selectedCustomer.total_purchases - selectedCustomer.total_paid > 0
                    ? "loss"
                    : "profit"
                }
              >
                {formatMoney(
                  Math.max(0, selectedCustomer.total_purchases - selectedCustomer.total_paid)
                )}
              </strong>
            </div>
          </div>

          {/* Customer Notes */}
          {selectedCustomer.notes && (
            <div className="customer-notes">
              <strong>Notes</strong>
              <p>{selectedCustomer.notes}</p>
            </div>
          )}

          {/* Purchase History */}
          <div className="card-header customer-history-header">
            <div>
              <h3>Purchase History</h3>
              <p>Sales made by this customer</p>
            </div>
          </div>

          {selectedCustomer.sales.length === 0 ? (
            <div className="empty-state" role="status">
              No sales found for this customer.
            </div>
          ) : (
            <div className="table-wrapper">
              <table aria-label="Customer purchase history">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Sale Total</th>
                    <th scope="col">Paid</th>
                    <th scope="col">Payment</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedCustomer.sales.map((sale) => {
                    const outstanding = Math.max(0, sale.total - sale.paid);
                    const isPaid = outstanding === 0;

                    return (
                      <tr key={sale.id}>
                        <td>{formatDateTime(sale.sale_date)}</td>
                        <td>{formatMoney(sale.total)}</td>
                        <td>{formatMoney(sale.paid)}</td>
                        <td>{getPaymentMethodName(sale.payment_method)}</td>
                        <td>
                          <span
                            className={`status-badge ${isPaid ? "paid" : "due"}`}
                            aria-label={isPaid ? "Paid" : `Due ${formatMoney(outstanding)}`}
                          >
                            {isPaid ? "Paid" : `Due ${formatMoney(outstanding)}`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default Customers;
