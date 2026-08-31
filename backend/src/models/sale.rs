// ============================================================
// SALE MODELS
//
// Defines the core data structures for sales, sale items,
// and payments.
// ============================================================

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// ------------------------------------------------------------------
// SALE
// ------------------------------------------------------------------

/// Represents a complete sale transaction.
///
/// A sale is the core business entity that records a transaction
/// between a customer and the business.
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Sale {
    /// Unique identifier (UUID v4)
    pub id: String,

    /// Optional reference to a customer (walk-in if None)
    pub customer_id: Option<String>,

    /// Date and time when the sale occurred (UTC)
    pub sale_date: DateTime<Utc>,

    /// Sum of all item totals before discount (in paise)
    pub subtotal: i64,

    /// Discount applied to the sale (in paise)
    pub discount: i64,

    /// Final amount after discount (in paise). Equals `subtotal - discount`.
    pub total: i64,

    /// Optional notes about the sale
    pub notes: Option<String>,

    /// Record creation timestamp
    pub created_at: DateTime<Utc>,

    /// Record last update timestamp
    pub updated_at: DateTime<Utc>,
}

// ------------------------------------------------------------------
// SALE ITEM
// ------------------------------------------------------------------

/// Represents a single product line within a sale.
///
/// Each sale item corresponds to one product sold in the sale,
/// storing the quantity, unit price, cost price (for COGS),
/// and the total amount for that line.
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct SaleItem {
    /// Unique identifier (UUID v4)
    pub id: String,

    /// The sale that this item belongs to
    pub sale_id: String,

    /// The product being sold
    pub product_id: String,

    /// Number of units sold
    pub quantity: i64,

    /// Selling price per unit at the time of sale (in paise)
    pub unit_price: i64,

    /// Cost price per unit (for COGS calculations, stored historically)
    pub cost_price: i64,

    /// Total amount for this item = `quantity * unit_price` (in paise)
    pub total: i64,
}

// ------------------------------------------------------------------
// PAYMENT
// ------------------------------------------------------------------

/// Represents a payment made towards a sale.
///
/// A sale can have multiple payments (e.g., split or partial payments).
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Payment {
    /// Unique identifier (UUID v4)
    pub id: String,

    /// The sale that this payment belongs to
    pub sale_id: String,

    /// Date and time when the payment was made (UTC)
    pub payment_date: DateTime<Utc>,

    /// Payment amount (in paise)
    pub amount: i64,

    /// Payment method (e.g., "cash", "upi", "card", "bank_transfer")
    pub payment_method: String,

    /// Optional reference number (e.g., transaction ID, cheque number)
    pub reference: Option<String>,

    /// Optional notes about the payment
    pub notes: Option<String>,

    /// Record creation timestamp
    pub created_at: DateTime<Utc>,
}
