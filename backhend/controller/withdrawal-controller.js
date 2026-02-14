const Withdrawal = require("../model/withdrawal");
const Vendor = require("../model/vendor");
const AccountDetails = require("../model/account-details");

// Get all withdrawal transactions for a vendor
const getWithdrawalHistory = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { status, page = 1, limit = 10 } = req.query;

        // Verify vendor exists
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }

        // Build filter
        const filter = { vendorId };
        if (status) {
            filter.status = status;
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Get withdrawals with pagination
        const withdrawals = await Withdrawal.find(filter)
            .sort({ requestedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const total = await Withdrawal.countDocuments(filter);
        const pages = Math.ceil(total / limit);

        // Calculate statistics
        const stats = await Withdrawal.aggregate([
            { $match: { vendorId: require("mongoose").Types.ObjectId(vendorId) } },
            {
                $group: {
                    _id: "$status",
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Format stats
        const statusStats = {};
        stats.forEach(stat => {
            statusStats[stat._id] = {
                totalAmount: stat.totalAmount,
                count: stat.count
            };
        });

        res.status(200).json({
            message: "Withdrawal history retrieved successfully",
            vendor: {
                name: vendor.shopName,
                email: vendor.email
            },
            transactions: withdrawals,
            pagination: {
                currentPage: parseInt(page),
                totalPages: pages,
                totalTransactions: total,
                limit: parseInt(limit)
            },
            statistics: {
                byStatus: statusStats,
                totalRequested: statusStats['Completed']?.totalAmount || 0,
                totalPending: statusStats['Pending']?.totalAmount || 0,
                pendingCount: statusStats['Pending']?.count || 0
            }
        });
    } catch (error) {
        console.error("Error fetching withdrawal history:", error);
        res.status(500).json({ 
            message: "Error fetching withdrawal history", 
            error: error.message 
        });
    }
};

// Get single withdrawal transaction details
const getWithdrawalDetails = async (req, res) => {
    try {
        const { withdrawalId } = req.params;

        const withdrawal = await Withdrawal.findById(withdrawalId).populate('vendorId', 'shopName email');

        if (!withdrawal) {
            return res.status(404).json({ message: "Withdrawal transaction not found" });
        }

        res.status(200).json({
            message: "Withdrawal details retrieved successfully",
            transaction: withdrawal
        });
    } catch (error) {
        console.error("Error fetching withdrawal details:", error);
        res.status(500).json({ 
            message: "Error fetching withdrawal details", 
            error: error.message 
        });
    }
};

// Create withdrawal record (called after processing withdrawal)
const createWithdrawalRecord = async (req, res) => {
    try {
        const { vendorId, amount, accountNumber, ifscCode, accountHolder } = req.body;

        // Verify vendor exists
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }

        // Get bank account details
        const accountDetails = await AccountDetails.findOne({ 
            userId: vendorId, 
            userType: 'vendor' 
        });

        // Create withdrawal record
        const withdrawal = new Withdrawal({
            vendorId,
            amount,
            status: 'Completed',
            processedAt: Date.now(),
            bankAccount: {
                accountNumber: accountNumber || accountDetails?.accountNumber,
                ifscCode: ifscCode || accountDetails?.ifscCode,
                accountHolder: accountHolder || accountDetails?.accountHolder
            }
        });

        const savedWithdrawal = await withdrawal.save();

        res.status(201).json({
            message: "Withdrawal record created successfully",
            transaction: savedWithdrawal
        });
    } catch (error) {
        console.error("Error creating withdrawal record:", error);
        res.status(500).json({ 
            message: "Error creating withdrawal record", 
            error: error.message 
        });
    }
};

// Update withdrawal status (for admin)
const updateWithdrawalStatus = async (req, res) => {
    try {
        const { withdrawalId } = req.params;
        const { status, failureReason, notes, transactionId } = req.body;

        // Validate status
        const validStatuses = ['Pending', 'Completed', 'Failed', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        // Find and update withdrawal
        const withdrawal = await Withdrawal.findByIdAndUpdate(
            withdrawalId,
            {
                status,
                failureReason: status === 'Failed' ? failureReason : null,
                notes,
                transactionId,
                processedAt: ['Completed', 'Failed'].includes(status) ? Date.now() : null
            },
            { new: true }
        );

        if (!withdrawal) {
            return res.status(404).json({ message: "Withdrawal transaction not found" });
        }

        res.status(200).json({
            message: "Withdrawal status updated successfully",
            transaction: withdrawal
        });
    } catch (error) {
        console.error("Error updating withdrawal status:", error);
        res.status(500).json({ 
            message: "Error updating withdrawal status", 
            error: error.message 
        });
    }
};

// Get withdrawal summary for vendor dashboard
const getWithdrawalSummary = async (req, res) => {
    try {
        const { vendorId } = req.params;

        // Verify vendor exists
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }

        // Get withdrawal statistics
        const summary = await Withdrawal.aggregate([
            { $match: { vendorId: require("mongoose").Types.ObjectId(vendorId) } },
            {
                $facet: {
                    totalWithdrawn: [
                        { $match: { status: 'Completed' } },
                        { $group: { _id: null, total: { $sum: "$amount" } } }
                    ],
                    pendingAmount: [
                        { $match: { status: 'Pending' } },
                        { $group: { _id: null, total: { $sum: "$amount" } } }
                    ],
                    recentTransactions: [
                        { $sort: { requestedAt: -1 } },
                        { $limit: 5 }
                    ],
                    allStats: [
                        {
                            $group: {
                                _id: "$status",
                                amount: { $sum: "$amount" },
                                count: { $sum: 1 }
                            }
                        }
                    ]
                }
            }
        ]);

        res.status(200).json({
            message: "Withdrawal summary retrieved successfully",
            summary: {
                totalWithdrawn: summary[0].totalWithdrawn[0]?.total || 0,
                pendingAmount: summary[0].pendingAmount[0]?.total || 0,
                recentTransactions: summary[0].recentTransactions,
                statistics: summary[0].allStats
            }
        });
    } catch (error) {
        console.error("Error fetching withdrawal summary:", error);
        res.status(500).json({ 
            message: "Error fetching withdrawal summary", 
            error: error.message 
        });
    }
};

// Get transactions list (clean endpoint - returns just array)
const getTransactionsList = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { status, page = 1, limit = 10 } = req.query;

        console.log(`📊 Fetching transactions for vendor: ${vendorId}`);

        // Verify vendor exists
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            console.error(`❌ Vendor not found: ${vendorId}`);
            return res.status(404).json({ message: "Vendor not found" });
        }

        // Build filter
        const filter = { vendorId };
        if (status) {
            filter.status = status;
        }

        console.log(`🔍 Filter:`, filter);

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Get withdrawals from the withdrawals collection
        const transactions = await Withdrawal.find(filter)
            .sort({ requestedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        console.log(`✅ Found ${transactions.length} transactions`);
        console.log(`📋 Transactions:`, transactions);

        res.status(200).json(transactions);
    } catch (error) {
        console.error("❌ Error fetching transactions list:", error);
        res.status(500).json({ 
            message: "Error fetching transactions list", 
            error: error.message 
        });
    }
};

module.exports = {
    getWithdrawalHistory,
    getWithdrawalDetails,
    createWithdrawalRecord,
    updateWithdrawalStatus,
    getWithdrawalSummary,
    getTransactionsList
};
