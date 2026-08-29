// ============================================================
// Products.tsx
// 
// A comprehensive product management component that provides:
// - Create new products with name, SKU, category, and pricing
// - Edit existing products
// - Add stock to products via modal
// - View product list with stock levels and profit per unit
// - Stock status indicators (In Stock, Low Stock, Out of Stock)
// - Responsive and accessible UI
// ============================================================

import { useCallback, useEffect, useState } from "react";
import "./Products.css";

// ============================================================
// TYPES
// ============================================================

/**
 * Complete product information
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
 * Form state for creating/editing products
 */
type ProductForm = {
  name: string;
  sku: string;
  category: string;
  cost_price: string;
  selling_price: string;
};

/**
 * Stock modal state
 */
type StockModalState = {
  product: Product | null;
  quantity: string;
  isOpen: boolean;
};

// ============================================================
// CONSTANTS
// ============================================================

// Use environment variable for API URL with fallback
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3000";

// Stock threshold constants
const STOCK_THRESHOLDS = {
  LOW: 10,
  CRITICAL: 5,
} as const;

/**
 * Creates an empty product form state
 */
const createEmptyForm = (): ProductForm => ({
  name: "",
  sku: "",
  category: "",
  cost_price: "",
  selling_price: "",
});

/**
 * Creates an empty stock modal state
 */
const createEmptyStockModal = (): StockModalState => ({
  product: null,
  quantity: "1",
  isOpen: false,
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
 * Gets the stock status badge class based on quantity
 * @param quantity - Current stock quantity
 * @returns CSS class name for styling
 */
const getStockBadgeClass = (quantity: number): string => {
  if (quantity === 0) return "out-of-stock";
  if (quantity <= STOCK_THRESHOLDS.CRITICAL) return "low-stock";
  return "in-stock";
};

/**
 * Gets the stock status label based on quantity
 * @param quantity - Current stock quantity
 * @returns Human-readable status label
 */
const getStockStatusLabel = (quantity: number): string => {
  if (quantity === 0) return "Out of Stock";
  if (quantity <= STOCK_THRESHOLDS.CRITICAL) return "Low Stock";
  return "In Stock";
};

// ============================================================
// MAIN COMPONENT
// ============================================================

function Products() {
  // ==========================================================
  // STATE
  // ==========================================================

  // Product data
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(createEmptyForm());
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Stock modal state
  const [stockModal, setStockModal] = useState<StockModalState>(createEmptyStockModal());

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingStock, setAddingStock] = useState(false);

  // Error/Success states
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================================
  // DATA FETCHING
  // ==========================================================

  /**
   * Fetches all products from the API
   */
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch(`${API_URL}/api/products`);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: Failed to load products`;
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

      const data: Product[] = await response.json();
      setProducts(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load products";
      setError(message);
      console.error("Products fetch error:", err);
    } finally {
      setLoading(false);
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

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/api/products`);

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: Failed to load products`;
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

        const data: Product[] = await response.json();

        if (!cancelled) {
          setProducts(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load products";
          setError(message);
          console.error("Products fetch error:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchProducts();

    return () => {
      cancelled = true;
    };
  }, []); // Empty dependency array = run once on mount

  // ==========================================================
  // FORM MANAGEMENT
  // ==========================================================

  /**
   * Handles form input changes
   */
  const handleFormChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
    // Clear errors when user types
    setError("");
  }, []);

  /**
   * Validates the product form
   * @returns Prices object if valid, null if invalid
   */
  const validateForm = useCallback((): { costPrice: number; sellingPrice: number } | null => {
    // Validate name
    if (!form.name.trim()) {
      setError("Product name is required.");
      return null;
    }

    // Validate prices
    if (!form.cost_price || !form.selling_price) {
      setError("Cost price and selling price are required.");
      return null;
    }

    const costPrice = Number(form.cost_price);
    const sellingPrice = Number(form.selling_price);

    if (!Number.isFinite(costPrice) || costPrice < 0) {
      setError("Enter a valid cost price (must be 0 or greater).");
      return null;
    }

    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      setError("Enter a valid selling price (must be 0 or greater).");
      return null;
    }

    // Warn if selling price is less than cost price
    if (sellingPrice < costPrice) {
      setError("Selling price should be greater than or equal to cost price.");
      return null;
    }

    return { costPrice, sellingPrice };
  }, [form]);

  /**
   * Resets the form to empty state
   */
  const resetForm = useCallback(() => {
    setForm(createEmptyForm());
    setEditingProduct(null);
    setError("");
    setSuccess("");
  }, []);

  // ==========================================================
  // PRODUCT OPERATIONS
  // ==========================================================

  /**
   * Creates a new product
   */
  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const prices = validateForm();
    if (!prices) return;

    try {
      setSaving(true);

      const response = await fetch(`${API_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          sku: form.sku.trim() || null,
          category: form.category.trim() || null,
          cost_price: prices.costPrice,
          selling_price: prices.sellingPrice,
          stock_quantity: 0,
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
        throw new Error(errorMessage || "Failed to create product.");
      }

      const product: Product = await response.json();
      setProducts((current) => [product, ...current]);
      resetForm();
      setSuccess(`Product "${product.name}" created successfully.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create product";
      setError(message);
      console.error("Product creation error:", err);
    } finally {
      setSaving(false);
    }
  }, [form, validateForm, resetForm]);

  /**
   * Starts editing a product
   * Populates the form with product data
   */
  const handleEdit = useCallback((product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      sku: product.sku || "",
      category: product.category || "",
      cost_price: String(product.cost_price),
      selling_price: String(product.selling_price),
    });
    setError("");
    setSuccess("");

    // Scroll to form for better UX
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /**
   * Updates an existing product
   */
  const handleUpdate = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingProduct) {
      setError("No product selected for editing.");
      return;
    }

    setError("");

    const prices = validateForm();
    if (!prices) return;

    try {
      setSaving(true);

      const response = await fetch(
        `${API_URL}/api/products/${editingProduct.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            sku: form.sku.trim() || null,
            category: form.category.trim() || null,
            cost_price: prices.costPrice,
            selling_price: prices.sellingPrice,
          }),
        }
      );

      if (!response.ok) {
        let errorMessage = await response.text();
        try {
          const parsed = JSON.parse(errorMessage);
          errorMessage = typeof parsed === 'string' ? parsed : parsed.message || errorMessage;
        } catch {
          // Keep the original text
        }
        throw new Error(errorMessage || "Failed to update product.");
      }

      const updatedProduct: Product = await response.json();

      setProducts((current) =>
        current.map((product) =>
          product.id === updatedProduct.id ? updatedProduct : product
        )
      );

      resetForm();
      setSuccess(`Product "${updatedProduct.name}" updated successfully.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update product";
      setError(message);
      console.error("Product update error:", err);
    } finally {
      setSaving(false);
    }
  }, [editingProduct, form, validateForm, resetForm]);

  // ==========================================================
  // STOCK OPERATIONS
  // ==========================================================

  /**
   * Opens the stock addition modal
   */
  const openStockModal = useCallback((product: Product) => {
    setStockModal({
      product,
      quantity: "1",
      isOpen: true,
    });
    setError("");
    setSuccess("");
  }, []);

  /**
   * Closes the stock addition modal
   */
  const closeStockModal = useCallback(() => {
    setStockModal(createEmptyStockModal());
    setError("");
  }, []);

  /**
   * Adds stock to a product
   */
  const handleAddStock = useCallback(async () => {
    if (!stockModal.product) {
      setError("No product selected.");
      return;
    }

    const quantity = Number(stockModal.quantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError("Stock quantity must be a positive whole number.");
      return;
    }

    try {
      setAddingStock(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/products/${stockModal.product.id}/stock`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ quantity }),
        }
      );

      if (!response.ok) {
        let errorMessage = await response.text();
        try {
          const parsed = JSON.parse(errorMessage);
          errorMessage = typeof parsed === 'string' ? parsed : parsed.message || errorMessage;
        } catch {
          // Keep the original text
        }
        throw new Error(errorMessage || "Failed to add stock.");
      }

      const updatedProduct: Product = await response.json();

      setProducts((current) =>
        current.map((product) =>
          product.id === updatedProduct.id ? updatedProduct : product
        )
      );

      setSuccess(
        `${quantity} item${quantity !== 1 ? "s" : ""} added to "${updatedProduct.name}".`
      );

      closeStockModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add stock";
      setError(message);
      console.error("Add stock error:", err);
    } finally {
      setAddingStock(false);
    }
  }, [stockModal, closeStockModal]);

  // ==========================================================
  // RENDER HELPERS
  // ==========================================================

  /**
   * Loading state renderer
   */
  if (loading) {
    return (
      <div className="products-page">
        <div className="loading" role="status" aria-label="Loading products">
          Loading products...
        </div>
      </div>
    );
  }

  // ==========================================================
  // MAIN RENDER
  // ==========================================================

  return (
    <div className="products-page" role="main" aria-label="Product Management">

      {/* ==========================================================
          HEADER
          ========================================================== */}
      <header className="page-header" aria-label="Products header">
        <div>
          <h2>Products</h2>
          <p>Manage the products you sell.</p>
        </div>

        <button
          className="refresh-button"
          onClick={() => void loadProducts()}
          disabled={loading || saving}
          aria-label="Refresh product list"
        >
          {loading ? "Loading..." : "Refresh"}
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
          PRODUCT FORM
          ========================================================== */}
      <section className="card" aria-label="Product form">
        <div className="card-header">
          <div>
            <h3>{editingProduct ? "Editing Product" : "Add Product"}</h3>
            <p>
              {editingProduct
                ? `Update "${editingProduct.name}" details.`
                : "Create a new product for your inventory."}
            </p>
          </div>
        </div>

        <form
          className="product-form"
          onSubmit={editingProduct ? handleUpdate : handleSubmit}
          noValidate
        >
          {/* Product Name - Required */}
          <div className="form-group">
            <label htmlFor="name">
              Product Name <span className="required">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="e.g. Notebook"
              value={form.name}
              onChange={handleFormChange}
              disabled={saving}
              required
              aria-required="true"
            />
          </div>

          {/* SKU - Optional */}
          <div className="form-group">
            <label htmlFor="sku">SKU</label>
            <input
              id="sku"
              name="sku"
              type="text"
              placeholder="e.g. NOTE-001"
              value={form.sku}
              onChange={handleFormChange}
              disabled={saving}
            />
          </div>

          {/* Category - Optional */}
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <input
              id="category"
              name="category"
              type="text"
              placeholder="e.g. Stationery"
              value={form.category}
              onChange={handleFormChange}
              disabled={saving}
            />
          </div>

          {/* Cost Price - Required */}
          <div className="form-group">
            <label htmlFor="cost_price">
              Cost Price <span className="required">*</span>
            </label>
            <input
              id="cost_price"
              name="cost_price"
              type="number"
              min="0"
              step="1"
              placeholder="Cost in paise"
              value={form.cost_price}
              onChange={handleFormChange}
              disabled={saving}
              required
              aria-required="true"
              aria-describedby="price-help"
            />
            <small id="price-help">Enter amount in paise (e.g., 3000 = ₹30.00)</small>
          </div>

          {/* Selling Price - Required */}
          <div className="form-group">
            <label htmlFor="selling_price">
              Selling Price <span className="required">*</span>
            </label>
            <input
              id="selling_price"
              name="selling_price"
              type="number"
              min="0"
              step="1"
              placeholder="Price in paise"
              value={form.selling_price}
              onChange={handleFormChange}
              disabled={saving}
              required
              aria-required="true"
              aria-describedby="price-help"
            />
            <small id="price-help">Enter amount in paise (e.g., 5000 = ₹50.00)</small>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving
                ? editingProduct
                  ? "Saving..."
                  : "Adding..."
                : editingProduct
                  ? "Save Changes"
                  : "Add Product"}
            </button>

            {editingProduct && (
              <button
                type="button"
                className="cancel-button"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* ==========================================================
          PRODUCT LIST
          ========================================================== */}
      <section className="card" aria-label="Product list">
        <div className="card-header">
          <div>
            <h3>Product List</h3>
            <p>
              {products.length} product
              {products.length !== 1 ? "s" : ""} in your catalog.
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="empty-state" role="status">
            <strong>No products yet</strong>
            <span>Add your first product using the form above.</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table aria-label="Product list table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">SKU</th>
                  <th scope="col">Category</th>
                  <th scope="col">Cost Price</th>
                  <th scope="col">Selling Price</th>
                  <th scope="col">Stock</th>
                  <th scope="col">Profit / Unit</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const profit = product.selling_price - product.cost_price;

                  return (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.name}</strong>
                      </td>

                      <td>{product.sku || "—"}</td>

                      <td>{product.category || "—"}</td>

                      <td>{formatMoney(product.cost_price)}</td>

                      <td>{formatMoney(product.selling_price)}</td>

                      <td>
                        <span
                          className={`stock-badge ${getStockBadgeClass(product.stock_quantity)}`}
                          aria-label={`Stock: ${product.stock_quantity} units, ${getStockStatusLabel(product.stock_quantity)}`}
                        >
                          {product.stock_quantity}
                        </span>
                      </td>

                      <td className={profit >= 0 ? "profit" : "loss"}>
                        {formatMoney(profit)}
                      </td>

                      <td>
                        <div className="product-actions">
                          <button
                            type="button"
                            className="action-button edit-button"
                            onClick={() => handleEdit(product)}
                            disabled={saving}
                            aria-label={`Edit ${product.name}`}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="action-button stock-button"
                            onClick={() => openStockModal(product)}
                            disabled={saving}
                            aria-label={`Add stock to ${product.name}`}
                          >
                            Add Stock
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ==========================================================
          STOCK MODAL
          ========================================================== */}
      {stockModal.isOpen && stockModal.product && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Add stock">
          <div className="modal">
            <h3>Add Stock</h3>
            <p>
              Add stock to <strong>{stockModal.product.name}</strong>
              <br />
              <small style={{ color: 'var(--text-muted)' }}>
                Current stock: {stockModal.product.stock_quantity} units
              </small>
            </p>

            {error && (
              <div className="error" style={{ marginBottom: '16px' }} role="alert">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="stock-quantity">Quantity</label>
              <input
                id="stock-quantity"
                type="number"
                min="1"
                step="1"
                value={stockModal.quantity}
                onChange={(event) => {
                  setStockModal((prev) => ({
                    ...prev,
                    quantity: event.target.value,
                  }));
                  setError("");
                }}
                disabled={addingStock}
                autoFocus
                aria-describedby="stock-modal-help"
              />
              <small id="stock-modal-help">Enter a positive whole number.</small>
            </div>

            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={closeStockModal}
                disabled={addingStock}
              >
                Cancel
              </button>

              <button
                className="confirm-button"
                onClick={handleAddStock}
                disabled={addingStock}
              >
                {addingStock ? "Adding..." : "Add Stock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;
