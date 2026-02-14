const AccountDetails = require("../model/account-details");

// Get account details for a user/vendor
const getAccountDetails = async (req, res) => {
    try {
        const { userId } = req.params;
        const userType = req.query.userType || req.body.userType || 'user'; // Default to 'user'

        const account = await AccountDetails.findOne({ userId, userType });

        if (!account) {
            return res.status(404).json({ message: "Account details not found" });
        }

        res.json(account);
    } catch (err) {
        console.error("Error fetching account details:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Create or update account details
const upsertAccountDetails = async (req, res) => {
    try {
        const { userId } = req.params;
        const {
            userType,
            accountHolderName,
            accountNumber,
            ifscCode,
            bankName,
            branchName,
            upiId,
            razorpayAccountId
        } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        // Check if account already exists
        const existingAccount = await AccountDetails.findOne({ userId, userType: userType || 'user' });
        
        const accountData = {
            userId,
            userType: userType || 'user',
            accountHolderName: accountHolderName || "",
            accountNumber: accountNumber || "",
            ifscCode: ifscCode || "",
            bankName: bankName || "",
            branchName: branchName || "",
            upiId: upiId || "",
            razorpayAccountId: razorpayAccountId || ""
        };

        // If updating existing account, reset verification status
        if (existingAccount) {
            accountData.isVerified = false;
            accountData.isRejected = false;
            accountData.verifiedAt = null;
            accountData.rejectedAt = null;
            accountData.rejectionReason = "";
            accountData.reviewedBy = null;
        }

        const account = await AccountDetails.findOneAndUpdate(
            { userId, userType: accountData.userType },
            accountData,
            { new: true, upsert: true }
        );

        res.status(200).json({ message: "Account details saved successfully", account });
    } catch (err) {
        console.error("Error saving account details:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Verify account details (admin action)
const verifyAccount = async (req, res) => {
    try {
        const { accountId } = req.params;
        const { adminId } = req.body; // Admin ID who is approving

        const account = await AccountDetails.findByIdAndUpdate(
            accountId,
            { 
                isVerified: true, 
                isRejected: false,
                verifiedAt: new Date(),
                reviewedBy: adminId || null,
                rejectionReason: "" // Clear rejection reason if any
            },
            { new: true }
        );

        if (!account) {
            return res.status(404).json({ message: "Account not found" });
        }

        res.json({ message: "Account verified successfully", account });
    } catch (err) {
        console.error("Error verifying account:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Reject account details (admin action)
const rejectAccount = async (req, res) => {
    try {
        const { accountId } = req.params;
        const { adminId, rejectionReason } = req.body;

        if (!rejectionReason || rejectionReason.trim() === "") {
            return res.status(400).json({ message: "Rejection reason is required" });
        }

        const account = await AccountDetails.findByIdAndUpdate(
            accountId,
            { 
                isVerified: false,
                isRejected: true,
                rejectedAt: new Date(),
                reviewedBy: adminId || null,
                rejectionReason: rejectionReason.trim()
            },
            { new: true }
        );

        if (!account) {
            return res.status(404).json({ message: "Account not found" });
        }

        res.json({ message: "Account rejected successfully", account });
    } catch (err) {
        console.error("Error rejecting account:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get all pending account requests (admin)
const getPendingAccounts = async (req, res) => {
    try {
        const accounts = await AccountDetails.find({
            isVerified: false,
            isRejected: false,
            accountNumber: { $ne: "" } // Only accounts with bank details
        })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 });

        res.json(accounts);
    } catch (err) {
        console.error("Error fetching pending accounts:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get all account requests (admin - pending, approved, rejected)
const getAllAccountRequests = async (req, res) => {
    try {
        const accounts = await AccountDetails.find({
            accountNumber: { $ne: "" } // Only accounts with bank details
        })
        .populate('userId', 'name email')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 });

        res.json(accounts);
    } catch (err) {
        console.error("Error fetching account requests:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

module.exports = {
    getAccountDetails,
    upsertAccountDetails,
    verifyAccount,
    rejectAccount,
    getPendingAccounts,
    getAllAccountRequests
};
