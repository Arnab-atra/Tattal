import { useEffect, useMemo, useState } from "react";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type CustomerSale = {
  id: string;
  sale_date: string;
  total: number;
  paid: number;
  payment_method: string | null;
};

type CustomerDetail = Customer & {
  sales_count: number;
  total_purchases: number;
  total_paid: number;
  sales: CustomerSale[];
};

const API_URL = "http://127.0.0.1:3000";

function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerDetail | null>(null);

  const [search, setSearch] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(
    null,
  );
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/customers`);

      if (!response.ok) {
        throw new Error("Failed to load customers.");
      }

      const data: Customer[] = await response.json();
      setCustomers(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load customers.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const resetCustomerForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerNotes("");
    setEditingCustomerId(null);
  };

  const startEditCustomer = async (customer: Customer) => {
    setError("");
    setEditingCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone ?? "");
    setCustomerEmail(customer.email ?? "");
    setCustomerNotes(customer.notes ?? "");
    setShowCreateForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const saveCustomer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = customerName.trim();

    if (!name) {
      setError("Customer name is required.");
      return;
    }

    try {
      setSavingCustomer(true);
      setError("");

      const isEditing = Boolean(editingCustomerId);

      const response = await fetch(
        isEditing
          ? `${API_URL}/api/customers/${editingCustomerId}`
          : `${API_URL}/api/customers`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            phone: customerPhone.trim() || null,
            email: customerEmail.trim() || null,
            notes: customerNotes.trim() || null,
          }),
        },
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message ||
            (isEditing
              ? "Failed to update customer."
              : "Failed to create customer."),
        );
      }

      const customer: Customer = await response.json();

      if (isEditing) {
        setCustomers((current) =>
          current.map((item) => (item.id === customer.id ? customer : item)),
        );

        if (selectedCustomer?.id === customer.id) {
          await openCustomer(customer.id);
        }
      } else {
        setCustomers((current) => [customer, ...current]);
      }

      setShowCreateForm(false);
      resetCustomerForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editingCustomerId
            ? "Failed to update customer."
            : "Failed to create customer.",
      );
    } finally {
      setSavingCustomer(false);
    }
  };

  const openCustomer = async (customerId: string) => {
    try {
      setLoadingDetail(true);
      setError("");

      const response = await fetch(`${API_URL}/api/customers/${customerId}`);

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to load customer.");
      }

      const data: CustomerDetail = await response.json();
      setSelectedCustomer(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customer.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatMoney = (amount: number) => {
    return `₹${(amount / 100).toFixed(2)} `;
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

    switch (method.toLowerCase()) {
      case "cash":
        return "Cash";
      case "upi":
        return "UPI";
      case "card":
        return "Card";
      case "bank_transfer":
        return "Bank Transfer";
      default:
        return method;
    }
  };

  const filteredCustomers = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return customers;
    }

    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(value) ||
        customer.phone?.toLowerCase().includes(value) ||
        customer.email?.toLowerCase().includes(value)
      );
    });
  }, [customers, search]);

  if (loading) {
    return <div className="loading">Loading customers...</div>;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Customers</h2>
          <p>Manage customers and view purchase history</p>
        </div>

        <div className="page-header-actions">
          <button
            className="secondary-button"
            onClick={() => {
              setShowCreateForm((current) => !current);
              setError("");

              if (showCreateForm) {
                resetCustomerForm();
              }
            }}
            disabled={savingCustomer}
          >
            {showCreateForm ? "Cancel" : "+ Add Customer"}
          </button>

          <button
            className="refresh-button"
            onClick={loadCustomers}
            disabled={loading || savingCustomer}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {showCreateForm && (
        <section className="card customer-create-card">
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

          <form onSubmit={saveCustomer} className="customer-form">
            <div className="customer-form-grid">
              <div className="form-group">
                <label htmlFor="customer-name">Name *</label>
                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Customer name"
                  disabled={savingCustomer}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="customer-phone">Phone</label>
                <input
                  id="customer-phone"
                  type="tel"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="Phone number"
                  disabled={savingCustomer}
                />
              </div>

              <div className="form-group">
                <label htmlFor="customer-email">Email</label>
                <input
                  id="customer-email"
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="Email address"
                  disabled={savingCustomer}
                />
              </div>
            </div>

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

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setShowCreateForm(false);
                  resetCustomerForm();
                  setError("");
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

      <section className="card">
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
            />
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="empty-state">
            {search
              ? "No customers match your search."
              : "No customers available yet."}
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Action</th>
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
                      <button
                        className="secondary-button"
                        onClick={() => openCustomer(customer.id)}
                      >
                        View
                      </button>

                      <button
                        className="secondary-button"
                        onClick={() => startEditCustomer(customer)}
                        disabled={savingCustomer}
                        style={{ marginLeft: "8px" }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {loadingDetail && (
        <section className="card">
          <div className="loading">Loading customer details...</div>
        </section>
      )}

      {selectedCustomer && !loadingDetail && (
        <section className="card customer-detail-card">
          <div className="card-header">
            <div>
              <h3>{selectedCustomer.name}</h3>
              <p>Customer details and purchase history</p>
            </div>

            <button
              className="secondary-button"
              onClick={() => setSelectedCustomer(null)}
            >
              Close
            </button>
          </div>

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
              <span>Sales</span>
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
              <span>Outstanding</span>
              <strong
                className={
                  selectedCustomer.total_purchases -
                    selectedCustomer.total_paid >
                  0
                    ? "loss"
                    : "profit"
                }
              >
                {formatMoney(
                  Math.max(
                    0,
                    selectedCustomer.total_purchases -
                      selectedCustomer.total_paid,
                  ),
                )}
              </strong>
            </div>
          </div>

          {selectedCustomer.notes && (
            <div className="customer-notes">
              <strong>Notes</strong>
              <p>{selectedCustomer.notes}</p>
            </div>
          )}

          <div className="card-header customer-history-header">
            <div>
              <h3>Purchase History</h3>
              <p>Sales made by this customer</p>
            </div>
          </div>

          {selectedCustomer.sales.length === 0 ? (
            <div className="empty-state">No sales found for this customer.</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Sale Total</th>
                    <th>Paid</th>
                    <th>Payment</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedCustomer.sales.map((sale) => {
                    const outstanding = Math.max(0, sale.total - sale.paid);

                    return (
                      <tr key={sale.id}>
                        <td>{formatDate(sale.sale_date)}</td>

                        <td>{formatMoney(sale.total)}</td>

                        <td>{formatMoney(sale.paid)}</td>

                        <td>{getPaymentMethodName(sale.payment_method)}</td>

                        <td className={outstanding > 0 ? "loss" : "profit"}>
                          {outstanding > 0
                            ? `Due ${formatMoney(outstanding)} `
                            : "Paid"}
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
    </>
  );
}

export default Customers;
