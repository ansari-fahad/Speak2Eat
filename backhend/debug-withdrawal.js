const mongoose = require('mongoose');
require('dotenv').config();

async function debugData() {
    const uri = process.env.MONOGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery';

    try {
        await mongoose.connect(uri);
        const rawWithdrawal = await mongoose.connection.db.collection('withdrawals').findOne({});
        console.log('Raw Withdrawal from DB:', JSON.stringify(rawWithdrawal, null, 2));
        if (rawWithdrawal) {
            console.log('vendorId type:', typeof rawWithdrawal.vendorId);
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

debugData();
