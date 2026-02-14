const mongoose = require("mongoose");

/**
 * ORDER MODEL
 * 
 * Important: Order Total includes all fees
 * Breakdown: total = itemPrice + deliveryCharge (40) + platformFee (4)
 * 
 * Example:
 *   Items: ₹200
 *   + Delivery: ₹40
 *   + Platform Fee: ₹4
 *   = Total: ₹244
 * 
 * Vendor Earnings Calculation:
 *   - Vendor gets: itemPrice - 2% commission
 *   - Example: ₹200 - ₹4 = ₹196
 *   - Vendor never sees delivery/platform fees
 * 
 * Payment Distribution (Future):
 *   - Admin: platformFee (₹4)
 *   - Delivery: deliveryCharge (₹40)
 *   - Vendor: itemPrice - commission - lateFees
 *   - Platform: 2% commission
 */
const orderSchema = new mongoose.Schema({
    userId: {
        type: String,
        ref: "BaseUser",
        required: true
    },
    products: [{
        productId: {
            type: String,
            ref: "Product",
            required: true
        },
        vendorId: {
            type: String,
            ref: "vendor",
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        }
    }],
    total: {
        type: Number,
        default: 0
    },
    paymentType: {
        type: String,
        required: true,
        enum: ['COD', 'Online', 'Card']
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        default: 'Pending',
        enum: ['Pending', 'Confirmed', 'Preparing', 'Ready for Pickup', 'Out for Delivery', 'Delivered', 'Cancelled']
    },
    // Preparation time tracking
    acceptedAt: {
        type: Date,
        default: null
    },
    preparationDeadline: {
        type: Date,
        default: null
    },
    deliveredAt: {
        type: Date,
        default: null
    },
    // Late fee tracking
    lateFeeApplied: {
        type: Boolean,
        default: false
    },
    lateFeeAmount: {
        type: Number,
        default: 0
    },
    lateFeePercentage: {
        type: Number,
        default: 10 // 10% late fee
    },
    // Delivery and Platform fees
    deliveryCharge: {
        type: Number,
        default: 40 // 40 Rs delivery charge
    },
    platformFee: {
        type: Number,
        default: 4 // 4 Rs platform fee
    },
    vendorOnlineAtOrder: {
        type: Boolean,
        default: true
    },
    vendorIncomeDeduction: {
        type: Number,
        default: 0 // 2% deduction if vendor offline at order time
    },
    // Food ready timestamp
    readyAt: {
        type: Date,
        default: null
    },
    // Rider assignment
    assignedRiderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DeliveryPartner",
        default: null
    },
    // Pickup timestamp
    pickedUpAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
