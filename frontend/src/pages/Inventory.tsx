import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  sku: string | null;
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

function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [movements, setMovements] = useState<InventoryMovement[]>([]);

  const [stockQuantity, setStockQuantity] = useState("");

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [addingStock, setAddingStock] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      setError("");

      const response = await fetch(`${API_URL}/api/products`);

      if (!response.ok) {
        throw new Error("Failed to load products.");
      }

      const data: Product[] = await response.json();

      setProducts(data);

      if (data.length === 0) {
        setSelectedProductId("");
        setMovements([]);
        return;
      }

      setSelectedProductId((current) => {
        const stillExists = data.some((product) => product.id === current);

        return stillExists ? current : data[0].id;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadMovements = async (productId: string) => {
    if (!productId) {
      setMovements([]);
      return;
    }

    try {
      setLoadingMovements(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/products/${productId}/inventory`,
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to load inventory history.");
      }

      const data: InventoryMovement[] = await response.json();

      setMovements(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load inventory history.",
      );
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      loadMovements(selectedProductId);
    } else {
      setMovements([]);
    }
  }, [selectedProductId]);

  const selectedProduct = products.find(
    (product) => product.id === selectedProductId,
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMovementLabel = (movement: InventoryMovement) => {
    if (movement.reference_type === "SALE") {
      return "Sale";
    }

    if (movement.reference_type === "STOCK_ADJUSTMENT") {
      return "Stock Added";
    }

    return movement.reference_type || "Manual Movement";
  };

  const addStock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedProductId) {
      setError("Please select a product.");
      return;
    }

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
        const message = await response.text();

        let errorMessage = message || "Failed to add stock.";

        try {
          const parsed = JSON.parse(message);

          if (typeof parsed === "string") {
            errorMessage = parsed;
          }
        } catch {
          // Keep the original response text.
        }

        throw new Error(errorMessage);
      }

      const updatedProduct: Product = await response.json();

      setProducts((current) =>
        current.map((product) =>
          product.id === updatedProduct.id ? updatedProduct : product,
        ),
      );

      setStockQuantity("");

      setSuccess(
        `${quantity} item${quantity !== 1 ? "s" : ""} added to ${updatedProduct.name
        }.`,
      );

      await loadMovements(selectedProductId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add stock.");
    } finally {
      setAddingStock(false);
    }
  };

  const refreshInventory = async () => {
    setError("");
    setSuccess("");

    await loadProducts();

    if (selectedProductId) {
      await loadMovements(selectedProductId);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Inventory</h2>
          <p>Manage stock and view inventory movement history.</p>
        </div>

        <button
          className="refresh-button"
          onClick={refreshInventory}
          disabled={loadingProducts || loadingMovements || addingStock}
        >
          {loadingProducts || loadingMovements ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {success && <div className="success">{success}</div>}

      <section className="card">
        <div className="card-header">
          <div>
            <h3>Stock Management</h3>
            <p>Select a product and add incoming stock.</p>
          </div>
        </div>

        {loadingProducts ? (
          <div className="loading">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            No products available. Add a product first.
          </div>
        ) : (
          <div className="inventory-selector">
            <div className="form-group">
              <label htmlFor="inventory-product">Product</label>

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
        )}

        {selectedProduct && (
          <form
            className="sale-form"
            onSubmit={addStock}
            style={{ marginTop: "24px" }}
          >
            <div className="sale-form-grid">
              <div className="form-group">
                <label htmlFor="stock-quantity">Add Stock</label>

                <input
                  id="stock-quantity"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Enter quantity"
                  value={stockQuantity}
                  onChange={(event) => setStockQuantity(event.target.value)}
                  disabled={addingStock}
                />

                <small>
                  Current stock: {selectedProduct.stock_quantity} units
                </small>
              </div>

              <div
                className="form-group"
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                }}
              >
                <button type="submit" disabled={addingStock}>
                  {addingStock ? "Adding Stock..." : "Add Stock"}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>

      {selectedProduct && (
        <section className="card">
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
            <div className="loading">Loading inventory history...</div>
          ) : movements.length === 0 ? (
            <div className="empty-state">
              No inventory movements recorded for this product yet.
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Reason</th>
                    <th>Reference</th>
                    <th>Notes</th>
                  </tr>
                </thead>

                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{formatDate(movement.created_at)}</td>

                      <td>
                        <span
                          className={
                            movement.movement_type === "IN"
                              ? "inventory-badge inventory-in"
                              : "inventory-badge inventory-out"
                          }
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
                        >
                          {movement.movement_type === "IN" ? "+" : "-"}
                          {movement.quantity}
                        </strong>
                      </td>

                      <td>{getMovementLabel(movement)}</td>

                      <td>
                        {movement.reference_id ? (
                          <code>{movement.reference_id}</code>
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
    </>
  );
}

export default Inventory;
