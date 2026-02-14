const express = require("express");
const router = express.Router();
const withdrawalController = require("../controller/withdrawal-controller");

// Get all withdrawal transactions for a vendor with filters and pagination
router.get("/vendor/:vendorId/history", withdrawalController.getWithdrawalHistory);

// Get transactions list (clean endpoint - returns just array)
router.get("/vendor/:vendorId/list", withdrawalController.getTransactionsList);

// Get withdrawal summary for vendor dashboard
router.get("/vendor/:vendorId/summary", withdrawalController.getWithdrawalSummary);

// Get specific withdrawal transaction details
router.get("/:withdrawalId/details", withdrawalController.getWithdrawalDetails);

// Create withdrawal record (after processing)
router.post("/create", withdrawalController.createWithdrawalRecord);

// Update withdrawal status (admin only)
router.put("/:withdrawalId/status", withdrawalController.updateWithdrawalStatus);

module.exports = router;
