const mongoose = require("mongoose");
const BaseUser = require("./base-user");
const vendorSchema = new mongoose.Schema({
  shopName: {
    type: String,
    default: "",
  },
  shopDescription: {
    type: String,
    default: ""
  },
  shopAddress: {
    type: String,
    default: ""  
  },
  shopContactNumber: {
    type: String, 
    default: "",
  
  },
  shopidentificationNumber: {
    type: String,
    default: "", //shtop-2
    unique: true
  },
  // Online/Offline Status
  isOnline: {
    type: Boolean,
    default: false
  },
  // Wallet/Pocket Balance (only online payments - available for withdrawal)
  walletBalance: {
    type: Number,
    default: 0
  },
  // Total earnings (all payments - cash + online)
  totalEarnings: {
    type: Number,
    default: 0
  },
  // Online earnings only (for withdrawal)
  onlineEarnings: {
    type: Number,
    default: 0
  },
  // Late fees deducted
  lateFeeDeducted: {
    type: Number,
    default: 0
  },
  // Total amount withdrawn (for calculating available balance)
  totalWithdrawn: {
    type: Number,
    default: 0
  },
  // Last online timestamp
  lastOnlineAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

const Vendor = BaseUser.discriminator("vendor", vendorSchema);

module.exports = Vendor;


