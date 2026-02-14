// Payment Gateway Integration (Razorpay)
// Uses RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET from .env

const crypto = require('crypto');
const Razorpay = require('razorpay');
const AccountDetails = require('../model/account-details');

// Initialize Razorpay client once using your keys
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Initialize Razorpay payment (for user checkout)
const createRazorpayOrder = async (req, res) => {
    try {
        const { amount, currency = 'INR', receipt } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }

        // Amount should be in paise (smallest currency unit)
        const amountInPaise = Math.round(amount * 100);

        // Create real Razorpay order
        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: currency,
            receipt: receipt || `receipt_${Date.now()}`,
            payment_capture: 1
        });

        res.status(200).json({
            success: true,
            order,
            // Send the public key to frontend; do NOT send secret
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({ message: "Error creating payment order", error: error.message });
    }
};

// Verify Razorpay payment signature
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: "Missing payment details" });
        }

        const secret = process.env.RAZORPAY_KEY_SECRET || '';
        const text = `${razorpay_order_id}|${razorpay_payment_id}`;
        const generatedSignature = crypto
            .createHmac('sha256', secret)
            .update(text)
            .digest('hex');

        if (generatedSignature === razorpay_signature) {
            res.status(200).json({
                success: true,
                message: "Payment verified successfully",
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id
            });
        } else {
            res.status(400).json({
                success: false,
                message: "Payment verification failed"
            });
        }
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({ message: "Error verifying payment", error: error.message });
    }
};

// Transfer money to vendor account (for withdrawals)
const transferToVendor = async (req, res) => {
    try {
        const { vendorId, amount, accountId } = req.body;

        if (!vendorId || !amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid vendor ID or amount" });
        }

        // Get vendor account details
        const accountDetails = await AccountDetails.findOne({ 
            userId: vendorId, 
            userType: 'vendor' 
        });

        if (!accountDetails) {
            return res.status(404).json({ 
                message: "Vendor account details not found. Please add bank account details first." 
            });
        }

        if (!accountDetails.isVerified) {
            return res.status(400).json({ 
                message: "Account not verified. Please wait for verification." 
            });
        }

        // Calculate 2% fee
        const feePercentage = 0.02; // 2%
        const feeAmount = amount * feePercentage;
        const transferAmount = amount - feeAmount;

        // Here you would use Razorpay Payouts API to transfer money
        // const Razorpay = require('razorpay');
        // const razorpay = new Razorpay({
        //     key_id: process.env.RAZORPAY_KEY_ID,
        //     key_secret: process.env.RAZORPAY_KEY_SECRET
        // });

        // const payout = await razorpay.payouts.create({
        //     account_number: accountDetails.accountNumber,
        //     fund_account: {
        //         account_type: 'bank_account',
        //         bank_account: {
        //             name: accountDetails.accountHolderName,
        //             ifsc: accountDetails.ifscCode,
        //             account_number: accountDetails.accountNumber
        //         }
        //     },
        //     amount: Math.round(transferAmount * 100), // in paise
        //     currency: 'INR',
        //     mode: 'NEFT',
        //     purpose: 'payout',
        //     queue_if_low_balance: true,
        //     reference_id: `payout_${Date.now()}`,
        //     narration: 'Vendor withdrawal'
        // });

        // Mock response - replace with actual Razorpay Payouts API call
        const mockPayout = {
            id: `payout_${Date.now()}`,
            entity: 'payout',
            fund_account_id: accountId || 'fa_dummy',
            amount: Math.round(transferAmount * 100),
            currency: 'INR',
            fees: Math.round(feeAmount * 100),
            tax: 0,
            status: 'queued',
            utr: `UTR${Date.now()}`,
            mode: 'NEFT',
            purpose: 'payout',
            reference_id: `payout_${Date.now()}`,
            narration: 'Vendor withdrawal',
            created_at: Date.now()
        };

        res.status(200).json({
            success: true,
            message: "Withdrawal initiated successfully",
            payout: mockPayout,
            transferAmount: transferAmount,
            feeAmount: feeAmount,
            totalAmount: amount
        });
    } catch (error) {
        console.error("Error transferring to vendor:", error);
        res.status(500).json({ message: "Error processing withdrawal", error: error.message });
    }
};

module.exports = {
    createRazorpayOrder,
    verifyPayment,
    transferToVendor
};
