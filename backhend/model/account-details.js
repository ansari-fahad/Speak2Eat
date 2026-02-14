const mongoose = require("mongoose");

const accountDetailsSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    ref: "BaseUser"
  },
  userType: {
    type: String,
    required: true,
    enum: ['user', 'vendor']
  },
  // Bank Account Details
  accountHolderName: {
    type: String,
    default: ""
  },
  accountNumber: {
    type: String,
    default: ""
  },
  ifscCode: {
    type: String,
    default: ""
  },
  bankName: {
    type: String,
    default: ""
  },
  branchName: {
    type: String,
    default: ""
  },
  // UPI Details
  upiId: {
    type: String,
    default: ""
  },
  // Payment Gateway Details (for vendors)
  razorpayAccountId: {
    type: String,
    default: ""
  },
  // Verification Status
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  // Rejection Status
  isRejected: {
    type: Boolean,
    default: false
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: ""
  },
  reviewedBy: {
    type: String,
    default: null,
    ref: "BaseUser"
  }
}, { timestamps: true });

// Ensure one account per user
accountDetailsSchema.index({ userId: 1, userType: 1 }, { unique: true });

module.exports = mongoose.model("AccountDetails", accountDetailsSchema);
