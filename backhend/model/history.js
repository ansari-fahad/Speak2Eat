const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
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
    orderDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("History", historySchema);
