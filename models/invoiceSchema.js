const mongoose = require("mongoose");
const User = require("./userSchema");
const Appointment = require("./appointmentSchema");

// Invoices Schema
const invoiceSchema = new mongoose.Schema(
  {
    user_obj: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invoice_url: { type: String },
    over_duo: { type: Date },
    status: {
      type: String,
      enum: ["open", "pending", "completed", "overduo"],
      default: "open",
    },
  },
  {
    timestamps: true,
  }
);

// Documents
const Invoice = mongoose.model("Invoice", invoiceSchema);

module.exports = Invoice;