const DeliveryPartner = require("../model/delivery-partner");
const Order = require("../model/order");

/**
 * DELIVERY PARTNER CONTROLLER
 * Handles order assignments, location tracking, and deliveries
 */

// ======================== DELIVERY PARTNER MANAGEMENT ========================

// Get delivery partner by ID
exports.getDeliveryPartnerById = async (req, res) => {
    try {
        const { id } = req.params;
        const partner = await DeliveryPartner.findById(id);
        
        if (!partner) {
            return res.status(404).json({ message: "Delivery partner not found" });
        }
        
        res.status(200).json(partner);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching delivery partner", error });
    }
};

// Create new delivery partner
exports.createDeliveryPartner = async (req, res) => {
    try {
        const { name, phone, email, vehicleType, vehicleNumber } = req.body;
        
        if (!name || !phone) {
            return res.status(400).json({ message: "Name and phone are required" });
        }
        
        const newPartner = new DeliveryPartner({
            name,
            phone,
            email,
            vehicleType: vehicleType || 'bike',
            vehicleNumber
        });
        
        await newPartner.save();
        res.status(201).json({ message: "Delivery partner created successfully", partner: newPartner });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating delivery partner", error });
    }
};

// Update delivery partner profile
exports.updateDeliveryPartner = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const partner = await DeliveryPartner.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!partner) {
            return res.status(404).json({ message: "Delivery partner not found" });
        }
        
        res.status(200).json({ message: "Delivery partner updated successfully", partner });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating delivery partner", error });
    }
};

// ======================== ONLINE/OFFLINE STATUS ========================

// Toggle delivery partner online status
exports.toggleOnlineStatus = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('[delivery-partner] toggleOnlineStatus called for id:', id, 'body:', req.body);
        const partner = await DeliveryPartner.findById(id);
        
        if (!partner) {
            return res.status(404).json({ message: "Delivery partner not found" });
        }
        
        partner.isOnline = !partner.isOnline;
        partner.lastOnlineAt = new Date();
        await partner.save();
        
        res.status(200).json({ 
            message: `Delivery partner is now ${partner.isOnline ? 'online' : 'offline'}`,
            partner 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error toggling online status", error });
    }
};

// ======================== LOCATION TRACKING ========================

// Update delivery partner location
exports.updateLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { latitude, longitude } = req.body;
        
        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({ message: "Latitude and longitude are required" });
        }
        
        const partner = await DeliveryPartner.findByIdAndUpdate(
            id,
            {
                currentLocation: {
                    latitude,
                    longitude,
                    lastUpdated: new Date()
                }
            },
            { new: true }
        );
        
        if (!partner) {
            return res.status(404).json({ message: "Delivery partner not found" });
        }
        
        res.status(200).json({ 
            message: "Location updated successfully",
            location: partner.currentLocation
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating location", error });
    }
};

// Get delivery partner current location
exports.getLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const partner = await DeliveryPartner.findById(id, 'currentLocation isOnline');
        
        if (!partner) {
            return res.status(404).json({ message: "Delivery partner not found" });
        }
        
        res.status(200).json(partner.currentLocation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching location", error });
    }
};

// ======================== ORDER MANAGEMENT ========================

// Get available delivery partners near a location
exports.getNearbyDeliveryPartners = async (req, res) => {
    try {
        const { latitude, longitude, radius = 5 } = req.query;
        
        if (!latitude || !longitude) {
            return res.status(400).json({ message: "Latitude and longitude are required" });
        }
        
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        
        // Find nearby available partners (simple distance calculation)
        // For production, use MongoDB geospatial queries
        const partners = await DeliveryPartner.find({
            isOnline: true,
            isAvailable: true,
            currentOrderId: null
        }).select('name phone currentLocation vehicleType averageRating');
        
        // Filter by distance (simple calculation)
        const nearbyPartners = partners.filter(partner => {
            const distance = calculateDistance(lat, lng, partner.currentLocation.latitude, partner.currentLocation.longitude);
            return distance <= radius;
        });
        
        // Sort by rating
        nearbyPartners.sort((a, b) => b.averageRating - a.averageRating);
        
        res.status(200).json({
            count: nearbyPartners.length,
            partners: nearbyPartners
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching nearby partners", error });
    }
};

// Assign order to delivery partner
exports.assignOrderToPartner = async (req, res) => {
    try {
        const { partnerId } = req.params;
        const { orderId } = req.body;
        
        const partner = await DeliveryPartner.findById(partnerId);
        if (!partner) {
            return res.status(404).json({ message: "Delivery partner not found" });
        }
        
        if (!partner.isOnline || !partner.isAvailable) {
            return res.status(400).json({ message: "Delivery partner is not available" });
        }
        
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        
        // Update order
        order.deliveryPartnerId = partnerId;
        order.status = 'Out for Delivery';
        await order.save();
        
        // Update partner
        partner.currentOrderId = orderId;
        partner.currentOrderStatus = 'ASSIGNED';
        partner.isAvailable = false;
        await partner.save();
        
        res.status(200).json({ 
            message: "Order assigned successfully",
            order,
            partner
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error assigning order", error });
    }
};

// Accept order by delivery partner
exports.acceptOrder = async (req, res) => {
    try {
        const { partnerId, orderId } = req.params;
        
        const partner = await DeliveryPartner.findById(partnerId);
        if (!partner) {
            return res.status(404).json({ message: "Delivery partner not found" });
        }
        
        if (String(partner.currentOrderId) !== orderId) {
            return res.status(400).json({ message: "This order is not assigned to you" });
        }
        
        // Update order
        const order = await Order.findByIdAndUpdate(
            orderId,
            { status: 'Out for Delivery' },
            { new: true }
        );
        
        // Update partner status
        partner.currentOrderStatus = 'PICKED_UP';
        await partner.save();
        
        res.status(200).json({ 
            message: "Order accepted",
            order,
            partner
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error accepting order", error });
    }
};

// Reject order by delivery partner
exports.rejectOrder = async (req, res) => {
    try {
        const { partnerId, orderId } = req.params;
        
        const partner = await DeliveryPartner.findById(partnerId);
        if (!partner) {
            return res.status(404).json({ message: "Delivery partner not found" });
        }
        
        if (String(partner.currentOrderId) !== orderId) {
            return res.status(400).json({ message: "This order is not assigned to you" });
        }
        
        // Update order status back to pending
        const order = await Order.findByIdAndUpdate(
            orderId,
            { 
                status: 'Confirmed',
                deliveryPartnerId: null 
            },
            { new: true }
        );
        
        // Clear partner's current order
        partner.currentOrderId = null;
        partner.currentOrderStatus = null;
        partner.isAvailable = true;
        partner.totalCancellations += 1;
        await partner.save();
        
        res.status(200).json({ 
            message: "Order rejected",
            order
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error rejecting order", error });
    }
};

// Mark order as delivered
exports.markOrderDelivered = async (req, res) => {
    try {
        const { partnerId, orderId } = req.params;
        const { rating, notes } = req.body;
        
        const partner = await DeliveryPartner.findById(partnerId);
        if (!partner) {
            return res.status(404).json({ message: "Delivery partner not found" });
        }
        
        // Find the order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        
        // Check if order is assigned to this rider (check both assignedRiderId and currentOrderId)
        const isAssigned = String(order.assignedRiderId) === String(partnerId) || 
                          String(partner.currentOrderId) === String(orderId);
        
        if (!isAssigned) {
            return res.status(400).json({ message: "This order is not assigned to you" });
        }
        
        // Check if order is in a deliverable state
        if (order.status === 'Delivered') {
            return res.status(400).json({ message: "Order is already delivered" });
        }
        
        if (order.status !== 'Out for Delivery' && order.status !== 'Picked Up') {
            return res.status(400).json({ message: `Order cannot be delivered. Current status: ${order.status}` });
        }
        
        // Update order
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { 
                status: 'Delivered',
                deliveredAt: new Date(),
                deliveryNotes: notes
            },
            { new: true }
        ).populate('products.productId').populate('products.vendorId');
        
        // ✅ UPDATE VENDOR EARNINGS WHEN ORDER DELIVERED (Non-blocking)
        if (updatedOrder && updatedOrder.products && updatedOrder.products.length > 0) {
            try {
                const Vendor = require('../model/vendor');
                const paymentType = updatedOrder.paymentType || 'COD';
                const isOnlinePayment = paymentType === 'Online' || paymentType === 'Card';
                
                // Get unique vendor IDs
                const vendorMap = {};
                for (const product of updatedOrder.products) {
                    const vendorId = product.vendorId?._id ? String(product.vendorId._id) : String(product.vendorId);
                    if (!vendorMap[vendorId]) {
                        vendorMap[vendorId] = [];
                    }
                    vendorMap[vendorId].push(product);
                }
                
                // Update each vendor's earnings
                for (const vendorId in vendorMap) {
                    const vendorProducts = vendorMap[vendorId];
                    let vendorOrderTotal = 0;
                    
                    // Calculate total for this vendor
                    for (const product of vendorProducts) {
                        const price = product.productId?.price || 0;
                        const qty = product.quantity || 0;
                        vendorOrderTotal += (price * qty);
                    }
                    
                    if (vendorOrderTotal > 0) {
                        // Apply 2% commission
                        const vendorIncome = vendorOrderTotal * 0.98;
                        
                        // Update vendor
                        const vendor = await Vendor.findByIdAndUpdate(
                            vendorId,
                            {
                                $inc: {
                                    'totalEarnings': vendorIncome,
                                    'walletBalance': isOnlinePayment ? vendorIncome : 0,
                                    'onlineEarnings': isOnlinePayment ? vendorIncome : 0
                                }
                            },
                            { new: true }
                        );
                        
                        if (vendor) {
                            console.log(`✅ Vendor ${vendorId} earnings: +₹${vendorIncome.toFixed(2)} (Total: ₹${vendor.totalEarnings.toFixed(2)})`);
                        }
                    }
                }
            } catch (vendorError) {
                console.error('⚠️ Vendor earnings update error:', vendorError.message);
                // Don't fail the delivery if vendor update fails
            }
        }
        
        // Calculate delivery earnings (need to define your commission structure)
        const deliveryEarnings = 40; // Example: ₹40 per delivery
        
        // Update partner
        partner.currentOrderId = null;
        partner.currentOrderStatus = null;
        partner.isAvailable = true;
        partner.totalDeliveries += 1;
        partner.totalEarnings += deliveryEarnings;
        partner.walletBalance += deliveryEarnings;
        
        // Update average rating
        if (rating) {
            const totalRatings = partner.totalDeliveries;
            partner.averageRating = ((partner.averageRating * (totalRatings - 1)) + rating) / totalRatings;
        }
        
        await partner.save();
        
        res.status(200).json({ 
            message: "Order delivered successfully",
            order: updatedOrder,
            earnedAmount: deliveryEarnings,
            partner
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error marking order delivered", error: error.message });
    }
};

// Get pending orders for delivery partner
exports.getPendingOrders = async (req, res) => {
    try {
        const { partnerId } = req.params;
        
        const partner = await DeliveryPartner.findById(partnerId);
        if (!partner) {
            return res.status(404).json({ message: "Delivery partner not found" });
        }
        
        if (!partner.currentOrderId) {
            return res.status(200).json({ message: "No pending orders", order: null });
        }
        
        const order = await Order.findById(partner.currentOrderId)
            .populate('userId', 'name phone address')
            .populate('products.productId', 'name price')
            .populate('products.vendorId', 'shopName shopAddress');
        
        res.status(200).json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching pending orders", error });
    }
};

// Get all orders for a delivery partner (pending and completed)
exports.getAllOrders = async (req, res) => {
    try {
        const { partnerId } = req.params;
        
        const partner = await DeliveryPartner.findById(partnerId);
        if (!partner) {
            return res.status(404).json({ message: "Delivery partner not found" });
        }
        
        // Find all orders assigned to this rider
        const orders = await Order.find({ assignedRiderId: partnerId })
            .populate('userId', 'name phone address email')
            .populate('products.productId', 'name price image')
            .populate('products.vendorId', 'shopName shopAddress shopContactNumber')
            .sort({ orderDate: -1 });
        
        // Separate pending and completed orders
        const pendingOrders = orders.filter(order => 
            order.status !== 'Delivered' && order.status !== 'Cancelled'
        );
        const completedOrders = orders.filter(order => 
            order.status === 'Delivered'
        );
        
        res.status(200).json({
            pending: pendingOrders,
            completed: completedOrders,
            all: orders
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching orders", error });
    }
};

// ======================== EARNINGS MANAGEMENT ========================

// Get delivery partner earnings summary
exports.getEarningsSummary = async (req, res) => {
    try {
        const { id } = req.params;
        
        const partner = await DeliveryPartner.findById(id, 
            'totalEarnings walletBalance totalDeliveries totalCancellations averageRating'
        );
        
        if (!partner) {
            return res.status(404).json({ message: "Delivery partner not found" });
        }
        
        const successRate = partner.totalDeliveries > 0 
            ? ((partner.totalDeliveries - partner.totalCancellations) / partner.totalDeliveries * 100).toFixed(2)
            : 0;
        
        res.status(200).json({
            totalEarnings: partner.totalEarnings,
            walletBalance: partner.walletBalance,
            totalDeliveries: partner.totalDeliveries,
            totalCancellations: partner.totalCancellations,
            successRate: parseFloat(successRate),
            averageRating: partner.averageRating
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching earnings", error });
    }
};

// ======================== HELPER FUNCTIONS ========================

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// ======================== PROFILE COMPLETION ========================

// Update delivery information (collected after signup)
exports.updateDeliveryInformation = async (req, res) => {
    try {
        const { id } = req.params;
        const { vehicleType, vehicleNumber, licenseNumber, aadharNumber, 
                bankAccountNumber, bankIfsc, bankHolderName } = req.body;

        // Validate required fields
        if (!vehicleType || !vehicleNumber || !licenseNumber || !aadharNumber ||
            !bankAccountNumber || !bankIfsc || !bankHolderName) {
            return res.status(400).json({ message: "All delivery information fields are required" });
        }

        // Update delivery partner with delivery information
        const partner = await DeliveryPartner.findByIdAndUpdate(
            id,
            {
                vehicleType,
                vehicleNumber,
                licenseNumber,
                aadharNumber,
                bankAccountNumber,
                bankIfsc,
                bankHolderName,
                profileComplete: true  // Mark profile as complete
            },
            { new: true }
        );

        if (!partner) {
            return res.status(404).json({ message: "Delivery partner not found" });
        }

        res.status(200).json({ 
            message: "Delivery information updated successfully", 
            partner 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating delivery information", error });
    }
};
