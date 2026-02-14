#!/usr/bin/env node

/**
 * Test Data Creation Script
 * Creates sample orders and transactions for testing
 * Run: node create-test-data.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Order = require('./model/order');
const Withdrawal = require('./model/withdrawal');
const Vendor = require('./model/vendor');
const User = require('./model/user');

async function createTestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food-delivery');
    console.log('✓ Connected to MongoDB');

    // Get first vendor or use test vendor ID
    let vendor = await Vendor.findOne().limit(1);
    if (!vendor) {
      console.log('✗ No vendors found. Please create a vendor first.');
      process.exit(1);
    }
    const vendorId = vendor._id;
    console.log(`✓ Using vendor: ${vendor.shopName} (${vendorId})`);

    // Get first user or create one
    let user = await User.findOne().limit(1);
    if (!user) {
      user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        number: '1234567890',
        address: 'Test Address'
      });
      console.log('✓ Created test user');
    }
    const userId = user._id;
    console.log(`✓ Using user: ${user.name}`);

    // Create sample orders
    const orders = [];
    const orderStatuses = ['Pending', 'Confirmed', 'Preparing', 'Ready for Pickup', 'Out for Delivery', 'Delivered'];
    
    for (let i = 0; i < 5; i++) {
      const order = new Order({
        userId,
        products: [
          {
            productId: new mongoose.Types.ObjectId(),
            vendorId,
            name: `Product ${i + 1}`,
            price: 100 + (i * 50),
            quantity: 1
          }
        ],
        total: 150 + (i * 50),
        deliveryCharge: 40,
        platformFee: 4,
        paymentType: 'card',
        status: orderStatuses[i % orderStatuses.length],
        orderDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Days ago
        vendorOnlineAtOrder: true
      });
      orders.push(order);
    }
    await Order.insertMany(orders);
    console.log(`✓ Created ${orders.length} sample orders`);

    // Create sample transactions (withdrawals)
    const transactions = [];
    const txnStatuses = ['Pending', 'Completed'];
    
    for (let i = 0; i < 3; i++) {
      const transaction = new Withdrawal({
        vendorId,
        amount: 1000 + (i * 500),
        status: txnStatuses[i % txnStatuses.length],
        bankAccount: {
          accountHolder: `${vendor.shopName} Owner`,
          accountNumber: `9876543210${i}`,
          ifscCode: 'SBIN0001234',
          bankName: 'State Bank of India'
        },
        requestedAt: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000), // Weeks ago
        remarks: `Test withdrawal ${i + 1}`
      });
      
      if (i === 0) {
        transaction.completedAt = new Date();
      }
      
      transactions.push(transaction);
    }
    await Withdrawal.insertMany(transactions);
    console.log(`✓ Created ${transactions.length} sample transactions`);

    console.log('\n✅ Test data created successfully!');
    console.log(`\nUse this vendor ID for testing:`);
    console.log(`${vendorId}`);
    console.log(`\nNow you can test the vendor history feature with real data.`);

  } catch (error) {
    console.error('✗ Error creating test data:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the script
createTestData();
