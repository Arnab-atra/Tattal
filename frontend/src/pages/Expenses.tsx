import { useEffect, useMemo, useState } from "react";

type Expense = {
  id: string;
  expense_date: string;
  category: string;
  description: string | null;
  amount: number;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const API_URL = "http://127.0.0.1:3000";

const createExpenseForm = () => ({
  category: "",
  description: "",
  amount: "",
  payment_method: "cash",
  notes: "",
});

function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState(createExpenseForm());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/expenses`);

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to load expenses.");
      }

      const data: Expense[] = await response.json();

      setExpenses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

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

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

  const updateForm = (
    field: "category" | "description" | "amount" | "payment_method" | "notes",
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(createExpenseForm());
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const category = form.category.trim();
    const amountRupees = Number(form.amount);

    if (!category) {
      setError("Expense category is required.");
      return;
    }

    if (!Number.isFinite(amountRupees) || amountRupees <= 0) {
      setError("Expense amount must be greater than zero.");
      return;
    }

    const amountPaise = Math.round(amountRupees * 100);

    if (amountPaise <= 0) {
      setError("Expense amount must be greater than zero.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`${API_URL}/api/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          description: form.description.trim() || null,
          amount: amountPaise,
          payment_method: form.payment_method || null,
          notes: form.notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to create expense.");
      }

      const newExpense: Expense = await response.json();

      setExpenses((current) => [newExpense, ...current]);
      resetForm();
      setSuccess("Expense recorded successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create expense.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading expenses...</div>;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Expenses</h2>
          <p>Record business expenses and view your expense history.</p>
        </div>

        <button
          className="refresh-button"
          onClick={loadExpenses}
          disabled={loading || saving}
        >
          Refresh
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {success && <div className="success">{success}</div>}

      <div className="sales-layout">
        <section className="card">
          <div className="card-header">
            <div>
              <h3>New Expense</h3>
              <p>Record a new business expense.</p>
            </div>
          </div>

          <form className="sale-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="expense-category">Category</label>

              <select
                id="expense-category"
                value={form.category}
                onChange={(event) => updateForm("category", event.target.value)}
                disabled={saving}
              >
                <option value="">Select category</option>
                <option value="Rent">Rent</option>
                <option value="Utilities">Utilities</option>
                <option value="Salary">Salary</option>
                <option value="Transport">Transport</option>
                <option value="Supplies">Supplies</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Marketing">Marketing</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="sale-form-grid">
              <div className="form-group">
                <label htmlFor="expense-amount">Amount</label>

                <input
                  id="expense-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(event) => updateForm("amount", event.target.value)}
                  disabled={saving}
                />

                <small>Enter amount in rupees.</small>
              </div>

              <div className="form-group">
                <label htmlFor="expense-payment-method">Payment Method</label>

                <select
                  id="expense-payment-method"
                  value={form.payment_method}
                  onChange={(event) =>
                    updateForm("payment_method", event.target.value)
                  }
                  disabled={saving}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="expense-description">Description</label>

              <input
                id="expense-description"
                type="text"
                placeholder="What was this expense for?"
                value={form.description}
                onChange={(event) =>
                  updateForm("description", event.target.value)
                }
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="expense-notes">Notes</label>

              <textarea
                id="expense-notes"
                rows={3}
                placeholder="Optional expense notes..."
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
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

              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Record Expense"}
              </button>
            </div>
          </form>
        </section>

        <section className="card sale-summary">
          <div className="card-header">
            <div>
              <h3>Expense Summary</h3>
              <p>Recorded expenses</p>
            </div>
          </div>

          <div className="sale-summary-content">
            <div className="sale-summary-row">
              <span>Total Expenses</span>
              <strong className="sale-total">
                {formatMoney(totalExpenses)}
              </strong>
            </div>

            <div className="sale-summary-row">
              <span>Transactions</span>
              <strong>{expenses.length}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-header">
          <div>
            <h3>Expense History</h3>
            <p>
              {expenses.length} expense
              {expenses.length !== 1 ? "s" : ""} recorded.
            </p>
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="empty-state">No expenses recorded yet.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th>Notes</th>
                </tr>
              </thead>

              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{formatDate(expense.expense_date)}</td>

                    <td>
                      <strong>{expense.category}</strong>
                    </td>

                    <td>{expense.description || "—"}</td>

                    <td>
                      {expense.payment_method
                        ? expense.payment_method === "bank_transfer"
                          ? "Bank Transfer"
                          : expense.payment_method.toUpperCase()
                        : "—"}
                    </td>

                    <td>
                      <strong>{formatMoney(expense.amount)}</strong>
                    </td>

                    <td>{expense.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

export default Expenses;
