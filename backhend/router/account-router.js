const express = require("express");
const router = express.Router();
const accountController = require("../controller/account-controller");

// NOTE: Define admin routes BEFORE parameter routes (/:userId)
// to avoid Express treating 'admin' as a userId.

// Get pending account requests (admin only)
router.get("/admin/pending", accountController.getPendingAccounts);

// Get all account requests (admin only)
router.get("/admin/all", accountController.getAllAccountRequests);

// Verify account (admin only)
router.patch("/:accountId/verify", accountController.verifyAccount);

// Reject account (admin only)
router.patch("/:accountId/reject", accountController.rejectAccount);

// Get account details
router.get("/:userId", accountController.getAccountDetails);

// Create or update account details
router.post("/:userId", accountController.upsertAccountDetails);
router.put("/:userId", accountController.upsertAccountDetails);

module.exports = router;
