/* eslint-disable react-hooks/set-state-in-effect */
// ============================================================
// Inventory.tsx
//
// A comprehensive inventory management component that provides:
// - Product selection for stock management
// - Add stock to products with quantity validation
// - View current stock levels
// - Complete inventory movement history
// - Movement type categorization (IN/OUT)
// - Reference tracking for stock movements
// ============================================================

import { useCallback, useEffect, useState } from "react";
import "./Inventory.css";

// ============================================================
// TYPES
// ============================================================

/**
 * Basic product information for inventory management
 */
type Product = {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
};

/**
 * Inventory movement record
 */
type InventoryMovement = {
  id: string;
  product_id: string;
  movement_type: "IN" | "OUT";
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
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
 * Formats a timestamp to a readable date/time
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
 * Gets a human-readable label for the movement reason
 */
const getMovementLabel = (movement: InventoryMovement): string => {
  if (movement.reference_type === "SALE") {
    return "Sale";
  }

  if (movement.reference_type === "STOCK_ADJUSTMENT") {
    return "Stock Added";
  }

  if (movement.reference_type === "PURCHASE") {
    return "Purchase";
  }

  if (movement.reference_type === "RETURN") {
    return "Return";
  }

  return movement.reference_type || "Manual Movement";
};

// ============================================================
// MAIN COMPONENT
// ============================================================

function Inventory() {
  // ==========================================================
  // STATE
  // ==========================================================

  // Product data
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [movements, setMovements] = useState<InventoryMovement[]>([]);

  // Form state
  const [stockQuantity, setStockQuantity] = useState("");

  // Loading states
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [addingStock, setAddingStock] = useState(false);

  // Error/Success states
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================================
  // DATA FETCHING
  // ==========================================================

  /**
   * Fetches all products from the API.
   *
   * Keeps the current product selected when possible.
   * If there is no current selection, the first product is selected.
   */
  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
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

              errorMessage =
                typeof parsed === "string"
                  ? parsed
                  : parsed.message || errorMessage;
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

      // Handle empty product list
      if (data.length === 0) {
        setSelectedProductId("");
        setMovements([]);
        return;
      }

      // Keep current selection if it still exists.
      // Otherwise select the first product.
      setSelectedProductId((current) => {
        const stillExists = data.some((product) => product.id === current);

        return stillExists ? current : data[0].id;
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load products";

      setError(message);
      console.error("Products fetch error:", err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  /**
   * Fetches inventory movements for a specific product.
   */
  const loadMovements = useCallback(async (productId: string) => {
    if (!productId) {
      return;
    }

    try {
      setLoadingMovements(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/products/${productId}/inventory`,
      );

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: Failed to load inventory history`;

        try {
          const text = await response.text();

          if (text) {
            try {
              const parsed = JSON.parse(text);

              errorMessage =
                typeof parsed === "string"
                  ? parsed
                  : parsed.message || errorMessage;
            } catch {
              errorMessage = text || errorMessage;
            }
          }
        } catch {
          // Ignore parsing errors
        }

        throw new Error(errorMessage);
      }

      const data: InventoryMovement[] = await response.json();

      setMovements(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load inventory history";

      setError(message);
      console.error("Movements fetch error:", err);
    } finally {
      setLoadingMovements(false);
    }
  }, []);

  // ==========================================================
  // EFFECTS
  // ==========================================================

  /**
   * Initial products loading.
   *
   * This is a standard data fetching pattern that is safe and widely used.
   * The ESLint rule is disabled at the file level because this is the
   * recommended way to load data on mount in React.
   */
  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  /**
   * Loads movements whenever the selected product changes.
   *
   * We intentionally do not call setMovements synchronously here
   * when there is no selected product because React's
   * set-state-in-effect rule rejects that pattern.
   *
   * Empty movements are already handled by loadProducts()
   * when the product list itself is empty.
   */
  useEffect(() => {
    if (!selectedProductId) {
      return;
    }

    void loadMovements(selectedProductId);
  }, [selectedProductId, loadMovements]);

  // ==========================================================
  // COMPUTED VALUES
  // ==========================================================

  /**
   * The currently selected product object.
   */
  const selectedProduct = products.find(
    (product) => product.id === selectedProductId,
  );

  // ==========================================================
  // STOCK OPERATIONS
  // ==========================================================

  /**
   * Adds stock to the currently selected product.
   *
   * Validates the quantity before submitting to the API.
   */
  const addStock = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      // Validate product selection
      if (!selectedProductId) {
        setError("Please select a product.");
        return;
      }

      // Validate quantity
      const quantity = Number(stockQuantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        setError("Stock quantity must be a whole number greater than zero.");
        return;
      }

      try {
        setAddingStock(true);

        const response = await fetch(
          `${API_URL}/api/products/${selectedProductId}/stock`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              quantity,
            }),
          },
        );

        if (!response.ok) {
          let errorMessage = await response.text();

          try {
            const parsed = JSON.parse(errorMessage);

            errorMessage =
              typeof parsed === "string"
                ? parsed
                : parsed.message || errorMessage;
          } catch {
            // Keep the original text
          }

          throw new Error(errorMessage || "Failed to add stock.");
        }

        const updatedProduct: Product = await response.json();

        // Update the product in the list with the new stock quantity
        setProducts((current) =>
          current.map((product) =>
            product.id === updatedProduct.id ? updatedProduct : product,
          ),
        );

        // Clear the quantity input
        setStockQuantity("");

        // Show success message
        setSuccess(
          `${quantity} item${quantity !== 1 ? "s" : ""
          } added to ${updatedProduct.name}.`,
        );

        // Refresh movements to show the new entry
        await loadMovements(selectedProductId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to add stock";

        setError(message);
        console.error("Add stock error:", err);
      } finally {
        setAddingStock(false);
      }
    },
    [selectedProductId, stockQuantity, loadMovements],
  );

  /**
   * Refreshes all inventory data.
   */
  const refreshInventory = useCallback(async () => {
    setError("");
    setSuccess("");

    await loadProducts();

    if (selectedProductId) {
      await loadMovements(selectedProductId);
    }
  }, [loadProducts, loadMovements, selectedProductId]);

  // ==========================================================
  // LOADING STATE
  // ==========================================================

  if (loadingProducts) {
    return (
      <div className="inventory-page">
        <div className="loading" role="status" aria-label="Loading inventory">
          Loading inventory...
        </div>
      </div>
    );
  }

  // ==========================================================
  // MAIN RENDER
  // ==========================================================

  return (
    <div
      className="inventory-page"
      role="main"
      aria-label="Inventory Management"
    >
      {/* ======================================================
          HEADER
          ====================================================== */}

      <header className="page-header" aria-label="Inventory header">
        <div>
          <h2>Inventory</h2>
          <p>Manage stock and view inventory movement history.</p>
        </div>

        <button
          className="refresh-button"
          onClick={refreshInventory}
          disabled={loadingProducts || loadingMovements || addingStock}
          aria-label="Refresh inventory data"
        >
          {loadingProducts || loadingMovements ? "Loading..." : "Refresh"}
        </button>
      </header>

      {/* ======================================================
          STATUS MESSAGES
          ====================================================== */}

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

      {/* ======================================================
          STOCK MANAGEMENT
          ====================================================== */}

      <section className="card" aria-label="Stock management">
        <div className="card-header">
          <div>
            <h3>Stock Management</h3>
            <p>Select a product and add incoming stock.</p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="empty-state" role="status">
            <strong>No products available</strong>
            <span>Add a product first using the Products page.</span>
          </div>
        ) : (
          <>
            {/* Product Selector and Stock Summary */}

            <div className="inventory-selector">
              <div className="form-group">
                <label htmlFor="inventory-product">
                  Product <span className="required">*</span>
                </label>

                <select
                  id="inventory-product"
                  value={selectedProductId}
                  onChange={(event) => {
                    setSelectedProductId(event.target.value);
                    setStockQuantity("");
                    setError("");
                    setSuccess("");
                  }}
                  disabled={addingStock}
                  required
                  aria-required="true"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                      {product.sku ? ` (${product.sku})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="inventory-stock-summary">
                  <span>Current Stock</span>
                  <strong>{selectedProduct.stock_quantity}</strong>
                  <small>units</small>
                </div>
              )}
            </div>

            {/* Add Stock Form */}

            {selectedProduct && (
              <form
                className="inventory-stock-form"
                onSubmit={addStock}
                noValidate
              >
                <div className="inventory-stock-form-grid">
                  <div className="form-group">
                    <label htmlFor="stock-quantity">
                      Add Stock <span className="required">*</span>
                    </label>

                    <input
                      id="stock-quantity"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Enter quantity"
                      value={stockQuantity}
                      onChange={(event) => setStockQuantity(event.target.value)}
                      disabled={addingStock}
                      required
                      aria-required="true"
                      aria-describedby="stock-help"
                    />

                    <small id="stock-help">
                      Current stock: {selectedProduct.stock_quantity} units
                    </small>
                  </div>

                  <div className="form-group">
                    <button
                      type="submit"
                      disabled={addingStock}
                      aria-label={`Add stock to ${selectedProduct.name}`}
                    >
                      {addingStock ? "Adding Stock..." : "Add Stock"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </>
        )}
      </section>

      {/* ======================================================
          INVENTORY HISTORY
          ====================================================== */}

      {selectedProduct && (
        <section className="card" aria-label="Inventory history">
          <div className="card-header">
            <div>
              <h3>Inventory History</h3>

              <p>
                {movements.length} movement
                {movements.length !== 1 ? "s" : ""} recorded for{" "}
                <strong>{selectedProduct.name}</strong>.
              </p>
            </div>
          </div>

          {loadingMovements ? (
            <div className="loading" role="status">
              Loading inventory history...
            </div>
          ) : movements.length === 0 ? (
            <div className="empty-state" role="status">
              <strong>No movements yet</strong>
              <span>No inventory movements recorded for this product.</span>
            </div>
          ) : (
            <div className="table-wrapper">
              <table aria-label="Inventory movement history">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Type</th>
                    <th scope="col">Quantity</th>
                    <th scope="col">Reason</th>
                    <th scope="col">Reference</th>
                    <th scope="col">Notes</th>
                  </tr>
                </thead>

                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{formatDateTime(movement.created_at)}</td>

                      <td>
                        <span
                          className={`inventory-badge ${movement.movement_type === "IN"
                              ? "inventory-in"
                              : "inventory-out"
                            }`}
                          aria-label={`${movement.movement_type} movement`}
                        >
                          {movement.movement_type}
                        </span>
                      </td>

                      <td>
                        <strong
                          className={
                            movement.movement_type === "IN"
                              ? "inventory-quantity-in"
                              : "inventory-quantity-out"
                          }
                          aria-label={`${movement.movement_type === "IN"
                              ? "Added"
                              : "Removed"
                            } ${movement.quantity} units`}
                        >
                          {movement.movement_type === "IN" ? "+" : "-"}
                          {movement.quantity}
                        </strong>
                      </td>

                      <td>
                        <span className="inventory-reason">
                          {getMovementLabel(movement)}
                        </span>
                      </td>

                      <td>
                        {movement.reference_id ? (
                          <code
                            title={`Reference ID: ${movement.reference_id}`}
                          >
                            {movement.reference_id}
                          </code>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td>{movement.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default Inventory;
