const express = require("express");
const router = express.Router();
const paymentController = require("../controller/payment-controller");

// Create Razorpay order (for user checkout)
router.post("/create-order", paymentController.createRazorpayOrder);

// Verify payment signature
router.post("/verify", paymentController.verifyPayment);

// Transfer to vendor (for withdrawals)
router.post("/transfer", paymentController.transferToVendor);

module.exports = router;
