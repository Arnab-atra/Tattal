// ============================================================
// Expenses.tsx
// 
// A comprehensive expense management component that provides:
// - Create new expenses with category, amount, and payment method
// - View expense history with filtering
// - Summary of total expenses
// - Category-based organization
// - Responsive and accessible UI
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import "./Expenses.css";

// ============================================================
// TYPES
// ============================================================

/**
 * Expense record from the API
 */
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

/**
 * Form state for creating/editing expenses
 */
type ExpenseForm = {
  category: string;
  description: string;
  amount: string;
  payment_method: string;
  notes: string;
};

// ============================================================
// CONSTANTS
// ============================================================

// Use environment variable for API URL with fallback
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3000";

// Expense categories
const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Salary",
  "Transport",
  "Supplies",
  "Maintenance",
  "Marketing",
  "Other",
] as const;

// Payment methods
const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
] as const;

/**
 * Creates an empty expense form state
 */
const createExpenseForm = (): ExpenseForm => ({
  category: "",
  description: "",
  amount: "",
  payment_method: "cash",
  notes: "",
});

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

/**
 * Gets the CSS class for a category badge
 * @param category - Expense category
 * @returns CSS class name for styling
 */
const getCategoryBadgeClass = (category: string): string => {
  return `category-badge ${category.toLowerCase()}`;
};

// ============================================================
// MAIN COMPONENT
// ============================================================

function Expenses() {
  // ==========================================================
  // STATE
  // ==========================================================

  // Expense data
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState<ExpenseForm>(createExpenseForm());

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Error/Success states
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================================
  // DATA FETCHING
  // ==========================================================

  /**
   * Fetches all expenses from the API
   */
  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_URL}/api/expenses`);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: Failed to load expenses`;
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

      const data: Expense[] = await response.json();
      setExpenses(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load expenses";
      setError(message);
      console.error("Expenses fetch error:", err);
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

    const fetchExpenses = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/api/expenses`);

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: Failed to load expenses`;
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

        const data: Expense[] = await response.json();

        if (!cancelled) {
          setExpenses(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load expenses";
          setError(message);
          console.error("Expenses fetch error:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchExpenses();

    return () => {
      cancelled = true;
    };
  }, []); // Empty dependency array = run once on mount

  // ==========================================================
  // COMPUTED VALUES
  // ==========================================================

  /**
   * Calculates the total of all expenses
   */
  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

  /**
   * Groups expenses by category for analysis
   */
  const expensesByCategory = useMemo(() => {
    const groups: Record<string, number> = {};
    expenses.forEach((expense) => {
      groups[expense.category] = (groups[expense.category] || 0) + expense.amount;
    });
    return groups;
  }, [expenses]);

  // ==========================================================
  // FORM MANAGEMENT
  // ==========================================================

  /**
   * Updates a specific field in the expense form
   */
  const updateForm = useCallback((
    field: keyof ExpenseForm,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    // Clear previous messages when user interacts with form
    setError("");
    setSuccess("");
  }, []);

  /**
   * Resets the form to empty state
   */
  const resetForm = useCallback(() => {
    setForm(createExpenseForm());
    setError("");
    setSuccess("");
  }, []);

  // ==========================================================
  // EXPENSE OPERATIONS
  // ==========================================================

  /**
   * Creates a new expense
   * Validates input before submitting to the API
   */
  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    // Validate category
    const category = form.category.trim();
    if (!category) {
      setError("Expense category is required.");
      return;
    }

    // Validate amount
    const amountRupees = Number(form.amount);
    if (!Number.isFinite(amountRupees) || amountRupees <= 0) {
      setError("Expense amount must be greater than zero.");
      return;
    }

    // Convert to paise (1/100 of a rupee)
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
        let errorMessage = await response.text();
        try {
          const parsed = JSON.parse(errorMessage);
          errorMessage = typeof parsed === 'string' ? parsed : parsed.message || errorMessage;
        } catch {
          // Keep the original text
        }
        throw new Error(errorMessage || "Failed to create expense.");
      }

      const newExpense: Expense = await response.json();

      // Add the new expense to the list (newest first)
      setExpenses((current) => [newExpense, ...current]);
      resetForm();
      setSuccess("Expense recorded successfully.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create expense.";
      setError(message);
      console.error("Expense creation error:", err);
    } finally {
      setSaving(false);
    }
  }, [form, resetForm]);

  // ==========================================================
  // RENDER HELPERS
  // ==========================================================

  /**
   * Loading state renderer
   */
  if (loading) {
    return (
      <div className="expenses-page">
        <div className="loading" role="status" aria-label="Loading expenses">
          Loading expenses...
        </div>
      </div>
    );
  }

  // ==========================================================
  // MAIN RENDER
  // ==========================================================

  return (
    <div className="expenses-page" role="main" aria-label="Expense Management">

      {/* ==========================================================
          HEADER
          ========================================================== */}
      <header className="page-header" aria-label="Expense management header">
        <div>
          <h2>Expenses</h2>
          <p>Record business expenses and view your expense history.</p>
        </div>

        <button
          className="refresh-button"
          onClick={() => void loadExpenses()}
          disabled={loading || saving}
          aria-label="Refresh expense list"
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
          EXPENSE FORM + SUMMARY
          ========================================================== */}
      <div className="expense-layout">
        {/* Create Expense Form */}
        <section className="card" aria-label="Create expense form">
          <div className="card-header">
            <div>
              <h3>New Expense</h3>
              <p>Record a new business expense.</p>
            </div>
          </div>

          <form className="expense-form" onSubmit={handleSubmit} noValidate>
            {/* Category - Required */}
            <div className="form-group">
              <label htmlFor="expense-category">
                Category <span className="required">*</span>
              </label>
              <select
                id="expense-category"
                value={form.category}
                onChange={(event) => updateForm("category", event.target.value)}
                disabled={saving}
                required
                aria-required="true"
              >
                <option value="">Select category</option>
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount and Payment Method */}
            <div className="expense-form-grid">
              <div className="form-group">
                <label htmlFor="expense-amount">
                  Amount (₹) <span className="required">*</span>
                </label>
                <input
                  id="expense-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(event) => updateForm("amount", event.target.value)}
                  disabled={saving}
                  required
                  aria-required="true"
                  aria-describedby="amount-help"
                />
                <small id="amount-help">Enter amount in rupees.</small>
              </div>

              <div className="form-group">
                <label htmlFor="expense-payment-method">Payment Method</label>
                <select
                  id="expense-payment-method"
                  value={form.payment_method}
                  onChange={(event) => updateForm("payment_method", event.target.value)}
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

            {/* Description */}
            <div className="form-group">
              <label htmlFor="expense-description">Description</label>
              <input
                id="expense-description"
                type="text"
                placeholder="What was this expense for?"
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                disabled={saving}
              />
            </div>

            {/* Notes */}
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
                {saving ? "Saving..." : "Record Expense"}
              </button>
            </div>
          </form>
        </section>

        {/* Expense Summary */}
        <section className="card expense-summary" aria-label="Expense summary">
          <div className="card-header">
            <div>
              <h3>Expense Summary</h3>
              <p>Recorded expenses</p>
            </div>
          </div>

          <div className="expense-summary-content">
            <div className="expense-summary-row">
              <span>Total Expenses</span>
              <strong className="expense-total">
                {formatMoney(totalExpenses)}
              </strong>
            </div>

            <div className="expense-summary-row">
              <span>Transactions</span>
              <strong>{expenses.length}</strong>
            </div>

            {/* Category breakdown */}
            {Object.entries(expensesByCategory).length > 0 && (
              <>
                <div className="expense-summary-row" style={{ borderTop: '2px solid var(--border)', paddingTop: '16px', marginTop: '4px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>By Category</span>
                </div>
                {Object.entries(expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([category, total]) => (
                    <div className="expense-summary-row" key={category}>
                      <span>{category}</span>
                      <strong>{formatMoney(total)}</strong>
                    </div>
                  ))}
              </>
            )}
          </div>
        </section>
      </div>

      {/* ==========================================================
          EXPENSE HISTORY
          ========================================================== */}
      <section className="card" aria-label="Expense history">
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
          <div className="empty-state" role="status">
            <strong>No expenses yet</strong>
            <span>Record your first expense using the form above.</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table aria-label="Expense history table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Category</th>
                  <th scope="col">Description</th>
                  <th scope="col">Payment</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>

              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{formatDateTime(expense.expense_date)}</td>

                    <td>
                      <span className={getCategoryBadgeClass(expense.category)}>
                        {expense.category}
                      </span>
                    </td>

                    <td>{expense.description || "—"}</td>

                    <td>
                      <span className="payment-badge">
                        {getPaymentMethodName(expense.payment_method)}
                      </span>
                    </td>

                    <td>
                      <strong className="expense-amount">
                        {formatMoney(expense.amount)}
                      </strong>
                    </td>

                    <td>{expense.notes || "—"}</td>
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

export default Expenses;
