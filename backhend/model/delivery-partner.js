const mongoose = require("mongoose");
const BaseUser = require("./base-user");

/**
 * DELIVERY PARTNER MODEL
 * 
 * Represents delivery/rider partners in the system
 * Handles order assignments, location tracking, and earnings
 */
const deliveryPartnerSchema = new mongoose.Schema({
  // Basic Info
  name: {
    type: String,
    required: true,
    default: ""
  },
  phone: {
    type: String,
    required: true,
    default: ""
  },
  email: {
    type: String,
    default: ""
  },
  
  // Delivery Details
  vehicleType: {
    type: String,
    enum: ['bike', 'scooter', 'car', 'bicycle'],
    default: 'bike'
  },
  vehicleNumber: {
    type: String,
    default: ""
  },
  
  // Status Tracking
  isOnline: {
    type: Boolean,
    default: false
  },
  isAvailable: {
    type: Boolean,
    default: true,
    description: "True if ready to accept orders, False if currently delivering"
  },
  currentLocation: {
    latitude: {
      type: Number,
      default: 0
    },
    longitude: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
  // Current Order
  currentOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    default: null
  },
  currentOrderStatus: {
    type: String,
    enum: ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
    default: null
  },
  
  // Earnings & Performance
  totalEarnings: {
    type: Number,
    default: 0
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  totalDeliveries: {
    type: Number,
    default: 0
  },
  totalCancellations: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 5,
    min: 1,
    max: 5
  },
  
  // Documents
  licenseNumber: {
    type: String,
    default: ""
  },
  aadharNumber: {
    type: String,
    default: ""
  },
  documentsVerified: {
    type: Boolean,
    default: false
  },
  
  // Bank Details for Payments
  bankAccountNumber: {
    type: String,
    default: ""
  },
  bankIFSC: {
    type: String,
    default: ""
  },
  
  // Activity Log
  lastOnlineAt: {
    type: Date,
    default: null
  },
  totalHoursWorked: {
    type: Number,
    default: 0
  },
  
  // Preferences
  preferredAreas: [String], // City areas they prefer
  maxOrdersPerDay: {
    type: Number,
    default: 15
  },
  
  acceptanceRadius: {
    type: Number,
    default: 5, // km
    description: "Maximum distance from current location to accept orders"
  },
  
  // Profile Status
  profileComplete: {
    type: Boolean,
    default: false,
    description: "Whether rider has completed delivery information"
  }
}, { timestamps: true });

// Index for geospatial queries
deliveryPartnerSchema.index({ "currentLocation.latitude": 1, "currentLocation.longitude": 1 });

const DeliveryPartner = BaseUser.discriminator("deliveryPartner", deliveryPartnerSchema);

module.exports = DeliveryPartner;
