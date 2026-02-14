const Order = require("../model/order");
const Vendor = require("../model/vendor");

// Create new order
const createOrder = async (req, res) => {
    try {
        console.log('📦 Order creation request received');
        console.log('📋 Request body:', JSON.stringify(req.body, null, 2));

        // Frontend sends SUBTOTAL only (sum of items). Backend adds delivery/platform exactly once.
        const { userId, products, total: subtotal, paymentType } = req.body;

        // Validate required fields
        if (!userId) {
            console.error('❌ Missing userId');
            return res.status(400).json({ message: "User ID is required" });
        }

        if (!products || !Array.isArray(products) || products.length === 0) {
            console.error('❌ Invalid products:', products);
            return res.status(400).json({ message: "Valid products array is required" });
        }

        if (!subtotal || subtotal <= 0) {
            console.error('❌ Invalid subtotal:', subtotal);
            return res.status(400).json({ message: "Valid subtotal is required" });
        }

        if (!paymentType) {
            console.error('❌ Missing paymentType');
            return res.status(400).json({ message: "Payment type is required" });
        }

        // Get vendor IDs from products
        const vendorIds = [...new Set(products.map(p => p.vendorId))];
        console.log('🔍 Checking vendor online status for:', vendorIds);

        // Check if all vendors are online
        const vendors = await Vendor.find({ _id: { $in: vendorIds } });
        const offlineVendors = vendors.filter(v => !v.isOnline);

        if (offlineVendors.length > 0) {
            console.error('❌ Cannot order from offline vendors:', offlineVendors.map(v => v._id));
            return res.status(400).json({
                message: "Cannot place order. One or more vendors are currently offline. Kitchen is closed.",
                offlineVendors: offlineVendors.map(v => ({ vendorId: v._id, shopName: v.shopName }))
            });
        }

        // Add delivery charge and platform fee to total
        const deliveryCharge = 40;
        const platformFee = 4;
        const totalWithFee = subtotal + deliveryCharge + platformFee;

        const newOrder = new Order({
            userId,
            products,
            total: totalWithFee,
            deliveryCharge: deliveryCharge,
            platformFee: platformFee,
            paymentType,
            status: 'Pending',
            vendorOnlineAtOrder: true
        });

        const savedOrder = await newOrder.save();
        console.log('✅ Order saved successfully:', savedOrder._id);
        console.log('💰 Platform fee (4 Rs) added to order');
        res.status(201).json(savedOrder);
    } catch (err) {
        console.error("❌ Error creating order:", err);
        console.error("Error message:", err.message);
        console.error("Error details:", err.errors);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get orders by user
const getOrdersByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        const orders = await Order.find({ userId })
            .populate('products.productId')
            .populate('products.vendorId')
            .sort({ orderDate: -1 });

        res.json(orders);
    } catch (err) {
        console.error('❌ Error fetching user orders:', err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get orders by vendor with vendor-specific calculations
// This returns orders formatted for vendor: shows only item prices, not fees
const getOrdersByVendorIdFormatted = async (req, res) => {
    try {
        const { vendorId } = req.params;

        // Find orders where any product has this vendorId
        const orders = await Order.find({ "products.vendorId": vendorId })
            .populate('products.productId')
            .populate('userId', 'name email number address')
            .sort({ orderDate: -1 });

        // Format orders for vendor display
        const formattedOrders = orders.map(order => {
            // Calculate vendor's share of items (excluding delivery/platform fees)
            const vendorProducts = order.products.filter(p => String(p.vendorId) === vendorId);
            const vendorItemTotal = vendorProducts.reduce((sum, p) => {
                const productPrice = p.productId?.price || 0;
                const quantity = p.quantity || 0;
                return sum + (productPrice * quantity);
            }, 0);

            // Calculate vendor's income after 2% commission
            const commissionRate = 0.02;
            const commissionAmount = vendorItemTotal * commissionRate;
            const vendorIncome = vendorItemTotal - commissionAmount;

            return {
                ...order.toObject(),
                // Override total with vendor's item total (without fees)
                vendorItemTotal: vendorItemTotal,
                vendorIncome: vendorIncome,
                vendorCommission: commissionAmount,
                // Keep original total hidden from vendor (they don't need to see fees)
                // But include for reference
                originalTotal: order.total,
                originalDeliveryCharge: order.deliveryCharge,
                originalPlatformFee: order.platformFee
            };
        });

        res.json(formattedOrders);
    } catch (err) {
        console.error('❌ Error fetching vendor orders:', err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get orders by vendor
const getOrdersByVendorId = async (req, res) => {
    try {
        const { vendorId } = req.params;

        // Find orders where any product has this vendorId
        const orders = await Order.find({ "products.vendorId": vendorId })
            .populate('products.productId')
            .populate('userId', 'name email number address')
            .sort({ orderDate: -1 });

        res.json(orders);
    } catch (err) {
        console.error('❌ Error fetching vendor orders:', err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get orders list from history collection (clean endpoint - returns just array)
const getOrdersList = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { status, page = 1, limit = 10 } = req.query;

        console.log(`📦 Fetching orders for vendor: ${vendorId}`);

        // Build filter - look for orders where any product has this vendorId
        const filter = { "products.vendorId": vendorId };
        if (status) {
            filter.status = status;
        }

        console.log(`🔍 Filter:`, filter);

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Get orders from Order collection (History collection is typically empty)
        const orders = await Order.find(filter)
            .populate('userId', 'name email number address')
            .sort({ orderDate: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        console.log(`✅ Found ${orders.length} orders`);
        console.log(`📋 Orders:`, orders);

        res.status(200).json(orders);
    } catch (error) {
        console.error("❌ Error fetching orders list:", error);
        res.status(500).json({
            message: "Error fetching orders list",
            error: error.message
        });
    }
};

// Update order status
const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }

        const updateData = { status };

        // When order is confirmed, set acceptedAt and preparationDeadline
        if (status === 'Confirmed') {
            updateData.acceptedAt = new Date();
            updateData.preparationDeadline = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
        }

        // When order is delivered, set deliveredAt
        if (status === 'Delivered') {
            updateData.deliveredAt = new Date();
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            updateData,
            { new: true }
        )
            .populate('products.productId')
            .populate('products.vendorId', 'shopName')
            .populate('userId', 'name email number');

        if (!updatedOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Emit socket event for real-time updates
        if (req.io) {
            // Ensure we get the ID string whether populated or not
            const socketUserId = (updatedOrder.userId && updatedOrder.userId._id)
                ? updatedOrder.userId._id
                : updatedOrder.userId;

            console.log(`📡 Emitting socket event for User: ${socketUserId}, Status: ${updatedOrder.status}`);

            req.io.emit('orderStatusUpdated', {
                orderId: updatedOrder._id,
                status: updatedOrder.status,
                userId: socketUserId,
                updatedOrder
            });
        }

        // When order is delivered, calculate vendor income (after 2% commission)
        if (status === 'Delivered') {
            const vendorIds = [...new Set(updatedOrder.products.map(p => String(p.vendorId)))];
            const paymentType = updatedOrder.paymentType || 'COD';
            const isOnlinePayment = paymentType === 'Online' || paymentType === 'Card';

            for (const vendorId of vendorIds) {
                // Calculate vendor's share from this order
                const vendorProducts = updatedOrder.products.filter(p => String(p.vendorId) === vendorId);
                const vendorOrderTotal = vendorProducts.reduce((sum, p) => {
                    const productPrice = p.productId?.price || 0;
                    const quantity = p.quantity || 0;
                    return sum + (productPrice * quantity);
                }, 0);

                // Deduct 2% commission from vendor income
                const commissionRate = 0.02; // 2%
                const commissionAmount = vendorOrderTotal * commissionRate;
                const vendorIncome = vendorOrderTotal - commissionAmount;

                // Update vendor wallet and earnings
                const vendor = await Vendor.findById(vendorId);
                if (vendor) {
                    // Always add to totalEarnings (cash + online)
                    vendor.totalEarnings += vendorIncome;

                    // Only add to walletBalance and onlineEarnings if payment is online/card
                    if (isOnlinePayment) {
                        vendor.walletBalance += vendorIncome;
                        vendor.onlineEarnings = (vendor.onlineEarnings || 0) + vendorIncome;
                    }
                    // Cash payments (COD) are NOT added to walletBalance - vendor receives cash directly

                    await vendor.save();
                }
            }
        }

        res.json(updatedOrder);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Mark order as ready for pickup
const markOrderReady = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { vendorId } = req.body;

        if (!orderId || !vendorId) {
            return res.status(400).json({ message: "Order ID and Vendor ID are required" });
        }

        // Find order and verify vendor
        const order = await Order.findById(orderId)
            .populate('products.productId')
            .populate('userId', 'name email number address');

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Verify vendor owns this order
        const vendorOwnsOrder = order.products.some(p => String(p.vendorId) === vendorId);
        if (!vendorOwnsOrder) {
            return res.status(403).json({ message: "Vendor does not own this order" });
        }

        // Update status to "Ready for Pickup"
        order.status = 'Ready for Pickup';
        order.readyAt = new Date();
        await order.save();

        console.log(`✅ Order ${orderId} marked as READY FOR PICKUP by vendor ${vendorId}`);

        // Emit socket event for real-time updates
        if (req.io) {
            req.io.emit('orderStatusUpdated', {
                orderId: order._id,
                status: order.status,
                userId: order.userId._id,
                updatedOrder: order
            });
        }

        res.status(200).json({
            message: "Order marked as ready for pickup",
            order,
            timestamp: new Date()
        });
    } catch (err) {
        console.error('❌ Error marking order ready:', err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get all orders ready for pickup (for riders)
const getReadyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ status: 'Ready for Pickup' })
            .populate('products.productId')
            .populate('products.vendorId', 'shopName shopAddress shopContactNumber')
            .populate('userId', 'name number address email')
            .sort({ readyAt: -1 }); // Newest first

        res.status(200).json(orders);
    } catch (err) {
        console.error('❌ Error fetching ready orders:', err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Assign rider to order (when rider accepts pickup)
const assignRiderToOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { riderId, vendorId } = req.body;

        if (!orderId || !riderId) {
            return res.status(400).json({ message: "Order ID and Rider ID are required" });
        }

        const order = await Order.findById(orderId)
            .populate('products.productId')
            .populate('products.vendorId', 'shopName shopAddress shopContactNumber')
            .populate('userId', 'name number address email');

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order.status !== 'Ready for Pickup') {
            return res.status(400).json({ message: "Order is not ready for pickup" });
        }

        // Import DeliveryPartner model
        const DeliveryPartner = require("../model/delivery-partner");

        // Assign rider
        order.assignedRiderId = riderId;
        order.status = 'Out for Delivery';
        order.pickedUpAt = new Date();
        await order.save();

        // Update delivery partner's current order
        const partner = await DeliveryPartner.findByIdAndUpdate(
            riderId,
            { currentOrderId: orderId, currentOrderStatus: 'Out for Delivery', isAvailable: false },
            { new: true }
        );

        console.log(`📍 Rider ${riderId} assigned to order ${orderId}`);

        // Emit socket event for real-time updates
        if (req.io) {
            // Re-fetch or use existing order object (it acts like a mongoose doc)
            // Ideally should populate properly if fields missing, but they are already populated above
            req.io.emit('orderStatusUpdated', {
                orderId: order._id,
                status: order.status,
                userId: order.userId._id,
                updatedOrder: order
            });
        }

        res.status(200).json({
            message: "Rider assigned successfully",
            order,
            vendorLocation: {
                address: order.products[0]?.vendorId?.shopAddress,
                phone: order.products[0]?.vendorId?.shopContactNumber
            },
            userLocation: {
                address: order.userId?.address,
                phone: order.userId?.number
            }
        });
    } catch (err) {
        console.error('❌ Error assigning rider:', err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get order details with vendor & user locations
const getOrderWithLocations = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId)
            .populate('products.productId')
            .populate('products.vendorId', 'shopName shopAddress shopContactNumber phone')
            .populate('userId', 'name number address email');

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Get first vendor (for single vendor orders)
        const vendor = order.products[0]?.vendorId || {};

        res.status(200).json({
            _id: order._id,
            status: order.status,
            items: order.products,
            total: order.total,
            estimatedTime: 30,
            vendor: {
                _id: vendor._id,
                name: vendor.shopName,
                address: vendor.shopAddress,
                phone: vendor.shopContactNumber || vendor.phone,
                location: {
                    coordinates: 'To be fetched from vendor location'
                }
            },
            user: {
                _id: order.userId?._id,
                name: order.userId?.name,
                address: order.userId?.address,
                phone: order.userId?.number,
                email: order.userId?.email,
                location: {
                    coordinates: 'To be fetched from user location'
                }
            },
            rider: {
                _id: order.assignedRiderId || null,
                status: order.status
            }
        });
    } catch (err) {
        console.error('❌ Error fetching order locations:', err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

module.exports = { createOrder, getOrdersByUserId, getOrdersByVendorId, getOrdersByVendorIdFormatted, updateOrderStatus, markOrderReady, getReadyOrders, assignRiderToOrder, getOrderWithLocations, getOrdersList };
