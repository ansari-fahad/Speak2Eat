const express = require("express");
const router = express.Router();
const vendorController = require("../controller/vendor-controller");

// ======================== SPECIFIC ROUTES (before /:id) ========================

// Check vendor online status (for frontend)
router.route('/check-status/:vendorId').get(vendorController.checkVendorStatus);

// ======================== WALLET/POCKET SYSTEM ========================
// Get wallet balance
router.route('/:id/wallet/balance').get(vendorController.getWalletBalance);

// Get total income from history table
router.route('/:id/wallet/income-from-history').get(vendorController.getTotalIncomeFromHistory);

// Add test earnings (for testing/demo)
router.route('/:id/wallet/add-test-earnings').post(vendorController.addTestEarnings);

// Add funds to wallet
router.route('/:id/wallet/add-funds').post(vendorController.addFundsToWallet);

// Request withdrawal
router.route('/:id/wallet/withdraw').post(vendorController.requestWithdrawal);

// ======================== ONLINE/OFFLINE STATUS ========================
// Toggle vendor online status
router.route('/:id/status/toggle').post(vendorController.toggleVendorStatus);

// Get vendor status
router.route('/:id/status').get(vendorController.getVendorStatus);

// ======================== GENERAL ROUTES (/:id must be last) ========================
// Get all vendors
router.route('/').get(vendorController.getAllVendors);

// Create new vendor
router.route('/').post(vendorController.createVendor);

// Get vendor by ID
router.route('/:id').get(vendorController.getVendorById);

// Update vendor
router.route('/:id').put(vendorController.updateVendor);

// Delete vendor
router.route('/:id').delete(vendorController.deleteVendor);

// ======================== ORDER PREPARATION TIME & LATE FEES ========================
// Apply late fee to order
router.route('/order/:orderId/late-fee').post(vendorController.applyLateFee);

// Deduct 2% income for offline period
router.route('/:vendorId/deduct-offline-income').post(vendorController.deductOfflineIncome);

module.exports = router;