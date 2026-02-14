const Vendor = require("../model/vendor");
const Order = require("../model/order");

// Get all vendors
exports.getAllVendors = async (req, res) => {
    try {
        const vendors = await Vendor.find();
        res.status(200).json(vendors);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching vendors", error });
    }
};

// Get vendor by ID
exports.getVendorById = async (req, res) => {
    try {
        const { id } = req.params;
        const vendor = await Vendor.findById(id);
        
        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }
        
        res.status(200).json(vendor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching vendor", error });
    }
};

// Create new vendor
exports.createVendor = async (req, res) => {
    try {
        const { shopName, shopDescription, shopAddress, shopContactNumber, shopidentificationNumber } = req.body;
        
        const newVendor = new Vendor({
            shopName,
            shopDescription,
            shopAddress,
            shopContactNumber,
            shopidentificationNumber
        });
        
        await newVendor.save();
        res.status(201).json(newVendor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating vendor", error });
    }
};

// Update vendor
exports.updateVendor = async (req, res) => {
    try {
        const { id } = req.params;
        const { shopName, shopDescription, shopAddress, shopContactNumber, shopidentificationNumber } = req.body;
        
        console.log("Update request for vendor ID:", id);
        console.log("Data to update:", { shopName, shopDescription, shopAddress, shopContactNumber, shopidentificationNumber });
        
        const updateData = {};
        if (shopName) updateData.shopName = shopName;
        if (shopDescription) updateData.shopDescription = shopDescription;
        if (shopAddress) updateData.shopAddress = shopAddress;
        if (shopContactNumber) updateData.shopContactNumber = shopContactNumber;
        if (shopidentificationNumber) updateData.shopidentificationNumber = shopidentificationNumber;
        
        const vendor = await Vendor.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!vendor) {
            console.log("Vendor not found with ID:", id);
            return res.status(404).json({ message: "Vendor not found" });
        }
        
        console.log("Vendor updated successfully:", vendor);
        res.status(200).json({ message: "Vendor updated successfully", vendor });
    } catch (error) {
        console.error("Error updating vendor:", error);
        res.status(500).json({ message: "Error updating vendor", error: error.message });
    }
};

// Delete vendor
exports.deleteVendor = async (req, res) => {
    try {
        const { id } = req.params;
        const vendor = await Vendor.findByIdAndDelete(id);
        
        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }
        
        res.status(200).json({ message: "Vendor deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting vendor", error });
    }
};

// ======================== ONLINE/OFFLINE STATUS ========================
// Toggle vendor online status
exports.toggleVendorStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const vendor = await Vendor.findById(id);
        
        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }
        
        vendor.isOnline = !vendor.isOnline;
        vendor.lastOnlineAt = new Date();
        await vendor.save();
        
        res.status(200).json({ 
            message: `Vendor is now ${vendor.isOnline ? 'online' : 'offline'}`,
            vendor 
        });
    } catch (error) {
        console.error("Error toggling vendor status:", error);
        res.status(500).json({ message: "Error toggling vendor status", error });
    }
};

// Get vendor online status
exports.getVendorStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const vendor = await Vendor.findById(id, 'isOnline lastOnlineAt walletBalance totalEarnings');
        
        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }
        
        res.status(200).json(vendor);
    } catch (error) {
        console.error("Error fetching vendor status:", error);
        res.status(500).json({ message: "Error fetching vendor status", error });
    }
};

// ======================== WALLET/POCKET SYSTEM ========================
// Get wallet balance with available balance calculation
exports.getWalletBalance = async (req, res) => {
    try {
        const { id } = req.params;
        const vendor = await Vendor.findById(id, 'walletBalance totalEarnings onlineEarnings lateFeeDeducted totalWithdrawn');
        
        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }
        
        // Calculate available balance: totalEarnings - totalWithdrawn (allows cash + online withdrawal)
        const totalIncome = vendor.totalEarnings || 0;
        const totalWithdrawn = vendor.totalWithdrawn || 0;
        const availableBalance = Math.max(0, totalIncome - totalWithdrawn);
        
        console.log(`📊 Wallet Balance for vendor ${id}:`);
        console.log(`   Total Earnings: ₹${totalIncome}`);
        console.log(`   Total Withdrawn: ₹${totalWithdrawn}`);
        console.log(`   Available Balance: ₹${availableBalance}`);
        
        res.status(200).json({
            walletBalance: vendor.walletBalance || 0,
            totalEarnings: totalIncome,
            totalIncome: totalIncome,
            onlineEarnings: vendor.onlineEarnings || 0,
            lateFeeDeducted: vendor.lateFeeDeducted || 0,
            totalWithdrawn: totalWithdrawn,
            availableBalance: availableBalance
        });
    } catch (error) {
        console.error("Error fetching wallet balance:", error);
        res.status(500).json({ message: "Error fetching wallet balance", error });
    }
};

// Add test earnings (for testing/demo purposes only)
exports.addTestEarnings = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }
        
        const vendor = await Vendor.findById(id);
        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }
        
        // Add test earnings
        vendor.totalEarnings = (vendor.totalEarnings || 0) + amount;
        vendor.walletBalance = (vendor.walletBalance || 0) + amount;
        
        await vendor.save();
        
        console.log(`✅ Test earnings added to vendor ${id}: +₹${amount}`);
        console.log(`   New Total Earnings: ₹${vendor.totalEarnings}`);
        
        res.status(200).json({
            message: "Test earnings added successfully",
            totalEarnings: vendor.totalEarnings,
            walletBalance: vendor.walletBalance,
            availableBalance: Math.max(0, vendor.totalEarnings - (vendor.totalWithdrawn || 0))
        });
    } catch (error) {
        console.error("Error adding test earnings:", error);
        res.status(500).json({ message: "Error adding test earnings", error });
    }
};

// Add funds to wallet
exports.addFundsToWallet = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, description } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }
        
        const vendor = await Vendor.findById(id);
        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }
        
        vendor.walletBalance += amount;
        vendor.totalEarnings += amount;
        await vendor.save();
        
        res.status(200).json({ 
            message: "Funds added successfully",
            walletBalance: vendor.walletBalance,
            totalEarnings: vendor.totalEarnings
        });
    } catch (error) {
        console.error("Error adding funds:", error);
        res.status(500).json({ message: "Error adding funds", error });
    }
};

// Get total income from history table (vendor's total earnings from all orders)
exports.getTotalIncomeFromHistory = async (req, res) => {
    try {
        const { id } = req.params; // vendor ID

        console.log(`💰 Fetching Total Income for Vendor ID: ${id}`);

        // Get vendor's stored totalEarnings (updated when orders are delivered)
        const vendor = await Vendor.findById(id, 'totalEarnings onlineEarnings');

        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }

        const totalIncome = vendor.totalEarnings || 0;
        const onlineEarnings = vendor.onlineEarnings || 0;

        console.log(`✅ Vendor ${id} Total Income (from database): ₹${totalIncome}`);
        console.log(`   Online Earnings: ₹${onlineEarnings}`);
        console.log(`   Cash Earnings: ₹${(totalIncome - onlineEarnings).toFixed(2)}`);

        res.status(200).json({
            vendorId: id,
            totalIncome: totalIncome,
            onlineEarnings: onlineEarnings,
            cashEarnings: totalIncome - onlineEarnings,
            source: 'database'
        });
    } catch (error) {
        console.error("❌ Error fetching total income:", error);
        res.status(500).json({ message: "Error fetching total income", error: error.message });
    }
};

// Request withdrawal - All cash + online income can be withdrawn (no fee deduction)
exports.requestWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        const minWithdrawAmount = 100;
        const AccountDetails = require('../model/account-details');
        const Withdrawal = require('../model/withdrawal');
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }
        
        if (amount < minWithdrawAmount) {
            return res.status(400).json({ message: `Minimum withdrawal amount is ₹${minWithdrawAmount}` });
        }
        
        const vendor = await Vendor.findById(id);
        if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
        }
        
        // 💰 Calculate available balance: totalEarnings - totalWithdrawn (all cash + online)
        const totalEarnings = vendor.totalEarnings || 0;
        const totalWithdrawn = vendor.totalWithdrawn || 0;
        const availableBalance = Math.max(0, totalEarnings - totalWithdrawn);
        
        console.log(`💰 Processing withdrawal for vendor ${id}`);
        console.log(`   Total Income: ₹${totalEarnings}`);
        console.log(`   Total Withdrawn: ₹${totalWithdrawn}`);
        console.log(`   Available Balance: ₹${availableBalance}`);
        console.log(`   Withdrawal Request: ₹${amount}`);
        
        // Check if vendor has enough available balance (cash + online)
        if (availableBalance < amount) {
            console.log(`❌ Insufficient balance. Requested: ₹${amount}, Available: ₹${availableBalance}`);
            return res.status(400).json({ 
                message: "Insufficient balance",
                availableBalance: availableBalance,
                totalEarnings: totalEarnings,
                requestedAmount: amount
            });
        }
        
        // Check if vendor has account details
        const accountDetails = await AccountDetails.findOne({ 
            userId: id, 
            userType: 'vendor' 
        });
        
        if (!accountDetails) {
            return res.status(400).json({ 
                message: "Please add your bank account details before withdrawing" 
            });
        }
        
        // No fee deduction - Full amount transferred
        const transferAmount = amount;
        
        // Track withdrawn amount (add to totalWithdrawn, not subtract from totalEarnings)
        vendor.totalWithdrawn = (vendor.totalWithdrawn || 0) + amount;
        
        // Also update walletBalance for backward compatibility
        vendor.walletBalance = Math.max(0, vendor.walletBalance - amount);
        
        await vendor.save();
        
        // Create withdrawal transaction record
        const withdrawal = new Withdrawal({
            vendorId: vendor._id,
            amount: amount,
            status: 'Completed',
            processedAt: Date.now(),
            bankAccount: {
                accountNumber: accountDetails.accountNumber,
                ifscCode: accountDetails.ifscCode,
                accountHolder: accountDetails.accountHolder
            }
        });
        
        await withdrawal.save();
        
        // Recalculate available balance after withdrawal
        const newAvailableBalance = Math.max(0, totalEarnings - vendor.totalWithdrawn);
        
        console.log(`✅ Withdrawal of ₹${amount} processed for vendor ${id}`);
        console.log(`   Amount transferred to bank: ₹${transferAmount.toFixed(2)}`);
        console.log(`   New Available Balance: ₹${newAvailableBalance}`);
        
        res.status(200).json({ 
            message: "Withdrawal processed successfully",
            withdrawalId: withdrawal._id,
            withdrawalAmount: amount,
            transferAmount: transferAmount,
            totalEarnings: totalEarnings,
            totalWithdrawn: vendor.totalWithdrawn,
            availableBalance: newAvailableBalance,
            remainingWalletBalance: vendor.walletBalance
        });
    } catch (error) {
        console.error("❌ Error processing withdrawal:", error);
        res.status(500).json({ message: "Error processing withdrawal", error: error.message });
    }
};

// ======================== ORDER PREPARATION TIME & LATE FEES ========================
// Apply late fee to order
exports.applyLateFee = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        
        // Check if order is past deadline
        if (order.preparationDeadline && new Date() > new Date(order.preparationDeadline)) {
            if (!order.lateFeeApplied) {
                const lateFeeAmount = Math.round((order.total * order.lateFeePercentage) / 100 * 100) / 100;
                order.lateFeeApplied = true;
                order.lateFeeAmount = lateFeeAmount;
                await order.save();
                
                // Deduct from vendor wallet
                const vendors = order.products[0].vendorId; // Assuming single vendor per order for simplicity
                const vendor = await Vendor.findById(vendors);
                if (vendor) {
                    vendor.walletBalance -= lateFeeAmount;
                    vendor.lateFeeDeducted += lateFeeAmount;
                    await vendor.save();
                }
                
                return res.status(200).json({ 
                    message: "Late fee applied",
                    lateFeeAmount,
                    order
                });
            }
        }
        
        res.status(200).json({ message: "No late fee applicable", order });
    } catch (error) {
        console.error("Error applying late fee:", error);
        res.status(500).json({ message: "Error applying late fee", error });
    }
};
// Check vendor online status
exports.checkVendorStatus = async (req, res) => {
    try {
        const { vendorId } = req.params;
        console.log('🔍 Checking vendor status for:', vendorId);
        
        const vendor = await Vendor.findById(vendorId);
        
        if (!vendor) {
            console.error('❌ Vendor not found:', vendorId);
            return res.status(404).json({ message: "Vendor not found" });
        }
        
        console.log('✅ Vendor status:', {
            shopName: vendor.shopName,
            isOnline: vendor.isOnline
        });
        
        res.status(200).json({
            vendorId: vendor._id,
            shopName: vendor.shopName,
            isOnline: vendor.isOnline,
            lastOnlineAt: vendor.lastOnlineAt
        });
    } catch (error) {
        console.error("Error checking vendor status:", error);
        res.status(500).json({ message: "Error checking vendor status", error });
    }
};

// Deduct 2% from vendor income (when they went offline during peak hours)
exports.deductOfflineIncome = async (req, res) => {
    try {
        const { vendorId } = req.params;
        console.log('💔 Deducting 2% from vendor:', vendorId);
        
        const vendor = await Vendor.findById(vendorId);
        
        if (!vendor) {
            console.error('❌ Vendor not found:', vendorId);
            return res.status(404).json({ message: "Vendor not found" });
        }
        
        // Calculate 2% of total earnings
        const deductionAmount = vendor.totalEarnings * 0.02;
        
        // Deduct from wallet balance
        vendor.walletBalance -= deductionAmount;
        vendor.totalEarnings -= deductionAmount;
        
        await vendor.save();
        
        console.log('✅ Deducted 2% from vendor wallet:', {
            vendorId: vendor._id,
            deductedAmount: deductionAmount,
            newWalletBalance: vendor.walletBalance
        });
        
        res.status(200).json({
            message: "2% deduction applied for offline period",
            deductedAmount: deductionAmount,
            newWalletBalance: vendor.walletBalance,
            newTotalEarnings: vendor.totalEarnings
        });
    } catch (error) {
        console.error("Error deducting offline income:", error);
        res.status(500).json({ message: "Error deducting income", error });
    }
};