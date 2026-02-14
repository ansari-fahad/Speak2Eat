const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();
const Order = require('./model/order');
const BaseUser = require('./model/base-user');

async function debugData() {
    const uri = process.env.MONOGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery';

    try {
        await mongoose.connect(uri);
        const orders = await Order.find({}).sort({ orderDate: -1 }).limit(5).populate('userId').lean();

        let output = '';
        orders.forEach(o => {
            output += `Order ID: ${o._id}\n`;
            output += `User ID: ${o.userId?._id || o.userId}\n`;
            output += `User Name: ${o.userId?.name || 'MISSING'}\n`;
            output += `User Address: ${JSON.stringify(o.userId?.address)}\n`;
            output += `---\n`;
        });

        fs.writeFileSync('debug_output.txt', output);
        console.log('Results saved to debug_output.txt');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

debugData();
