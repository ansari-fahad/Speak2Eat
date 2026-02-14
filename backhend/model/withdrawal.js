const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema({
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed', 'Cancelled'],
        default: 'Pending'
    },
    transactionId: {
        type: String,
        sparse: true // Optional, for bank transfer tracking
    },
    bankAccount: {
        accountNumber: String,
        ifscCode: String,
        accountHolder: String
    },
    reason: {
        type: String,
        default: 'Vendor withdrawal request'
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    processedAt: {
        type: Date,
        sparse: true // Only populated when completed/failed
    },
    failureReason: {
        type: String,
        sparse: true
    },
    notes: {
        type: String,
        sparse: true
    }
}, { timestamps: true });

// Index for faster queries
withdrawalSchema.index({ vendorId: 1, requestedAt: -1 });
withdrawalSchema.index({ status: 1 });

module.exports = mongoose.model("Withdrawal", withdrawalSchema);
