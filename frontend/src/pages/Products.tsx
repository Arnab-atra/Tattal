import { useEffect, useState } from "react";

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

type ProductForm = {
  name: string;
  sku: string;
  category: string;
  cost_price: string;
  selling_price: string;
};

const API_URL = "http://127.0.0.1:3000";

const emptyForm: ProductForm = {
  name: "",
  sku: "",
  category: "",
  cost_price: "",
  selling_price: "",
};

function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stockAdding, setStockAdding] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/products`);

      if (!response.ok) {
        throw new Error("Failed to load products");
      }

      const data: Product[] = await response.json();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (!form.cost_price || !form.selling_price) {
      setError("Cost price and selling price are required.");
      return;
    }

    const costPrice = Number(form.cost_price);
    const sellingPrice = Number(form.selling_price);

    if (!Number.isFinite(costPrice) || costPrice < 0) {
      setError("Enter a valid cost price.");
      return;
    }

    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      setError("Enter a valid selling price.");
      return;
    }

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
          cost_price: costPrice,
          selling_price: sellingPrice,
          stock_quantity: 0,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to create product");
      }

      const product: Product = await response.json();

      setProducts((current) => [product, ...current]);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setSaving(false);
    }
  };

  const formatMoney = (amount: number) => {
    return `₹${(amount / 100).toFixed(2)}`;
  };

  const handleAddStock = async (product: Product) => {
    const input = window.prompt(
      `Add stock for ${product.name}. Current stock: ${product.stock_quantity}`,
      "1",
    );

    if (input === null) {
      return;
    }

    const quantity = Number(input);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError("Stock quantity must be a positive whole number.");
      return;
    }

    try {
      setError("");
      setStockAdding(product.id);

      const response = await fetch(
        `${API_URL}/api/products/${product.id}/stock`,
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
        throw new Error(message || "Failed to add stock");
      }

      const updatedProduct: Product = await response.json();

      setProducts((current) =>
        current.map((currentProduct) =>
          currentProduct.id === updatedProduct.id
            ? updatedProduct
            : currentProduct,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add stock");
    } finally {
      setStockAdding(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Products</h2>
          <p>Manage the products you sell.</p>
        </div>

        <button
          className="refresh-button"
          onClick={loadProducts}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <section className="card">
        <div className="card-header">
          <div>
            <h3>Add Product</h3>
            <p>Create a new product for your inventory.</p>
          </div>
        </div>

        <form className="product-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Product Name</label>

            <input
              id="name"
              name="name"
              type="text"
              placeholder="e.g. Notebook"
              value={form.name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="sku">SKU</label>

            <input
              id="sku"
              name="sku"
              type="text"
              placeholder="e.g. NOTE-001"
              value={form.sku}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>

            <input
              id="category"
              name="category"
              type="text"
              placeholder="e.g. Stationery"
              value={form.category}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="cost_price">Cost Price</label>

            <input
              id="cost_price"
              name="cost_price"
              type="number"
              min="0"
              step="1"
              placeholder="3000"
              value={form.cost_price}
              onChange={handleChange}
            />

            <small>Enter amount in paise</small>
          </div>

          <div className="form-group">
            <label htmlFor="selling_price">Selling Price</label>

            <input
              id="selling_price"
              name="selling_price"
              type="number"
              min="0"
              step="1"
              placeholder="5000"
              value={form.selling_price}
              onChange={handleChange}
            />

            <small>Enter amount in paise</small>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add Product"}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h3>Product List</h3>
            <p>
              {products.length} product
              {products.length !== 1 ? "s" : ""} in your catalog.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            No products yet. Add your first product above.
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Cost Price</th>
                  <th>Selling Price</th>
                  <th>Stock</th>
                  <th>Profit / Unit</th>
                  <th>Actions</th>
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
                        <strong>{product.stock_quantity}</strong>
                      </td>

                      <td className={profit >= 0 ? "profit" : "loss"}>
                        {formatMoney(profit)}
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() => handleAddStock(product)}
                          disabled={stockAdding === product.id}
                        >
                          {stockAdding === product.id
                            ? "Adding..."
                            : "Add Stock"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

export default Products;
