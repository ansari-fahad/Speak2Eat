/**
 * SOCKET.IO SERVICE FOR REAL-TIME DELIVERY TRACKING
 * 
 * Handles:
 * - Live location updates
 * - Order status updates
 * - Real-time communication between user, vendor, and delivery partner
 */

module.exports = (io) => {
    // Store active delivery tracking sessions
    const deliveryTracking = {};

    io.on('connection', (socket) => {
        console.log('✅ User connected:', socket.id);

        // ======================== DELIVERY PARTNER EVENTS ========================

        // Delivery partner comes online
        socket.on('delivery-partner-online', (data) => {
            const { partnerId, latitude, longitude } = data;
            console.log(`🟢 Delivery partner ${partnerId} came online at [${latitude}, ${longitude}]`);
            
            // Join room with partner ID
            socket.join(`partner-${partnerId}`);
            
            // Broadcast to admin/system
            io.emit('delivery-partner-status', {
                partnerId,
                status: 'online',
                location: { latitude, longitude },
                timestamp: new Date()
            });
        });

        // Delivery partner updates location in real-time
        socket.on('delivery-partner-location-update', (data) => {
            const { partnerId, orderId, latitude, longitude } = data;
            
            if (!deliveryTracking[orderId]) {
                deliveryTracking[orderId] = {};
            }
            
            deliveryTracking[orderId].partnerLocation = {
                latitude,
                longitude,
                timestamp: new Date()
            };
            
            // Broadcast to order room (user, vendor, admin)
            io.to(`order-${orderId}`).emit('delivery-location-update', {
                partnerId,
                orderId,
                location: { latitude, longitude },
                timestamp: new Date()
            });
            
            console.log(`📍 Partner ${partnerId} location updated: [${latitude}, ${longitude}]`);
        });

        // Delivery partner accepts order
        socket.on('delivery-partner-accept-order', (data) => {
            const { partnerId, orderId } = data;
            console.log(`✅ Partner ${partnerId} accepted order ${orderId}`);
            
            // Notify all stakeholders
            io.to(`order-${orderId}`).emit('delivery-partner-accepted', {
                partnerId,
                orderId,
                status: 'ACCEPTED',
                timestamp: new Date()
            });
        });

        // Delivery partner picks up order
        socket.on('delivery-partner-picked-up', (data) => {
            const { partnerId, orderId, location } = data;
            console.log(`📦 Partner ${partnerId} picked up order ${orderId}`);
            
            io.to(`order-${orderId}`).emit('delivery-pickup', {
                partnerId,
                orderId,
                status: 'PICKED_UP',
                pickupLocation: location,
                estimatedDeliveryTime: calculateETA(location),
                timestamp: new Date()
            });
        });

        // Delivery partner delivers order
        socket.on('delivery-partner-delivered', (data) => {
            const { partnerId, orderId, photo, notes } = data;
            console.log(`✅ Partner ${partnerId} delivered order ${orderId}`);
            
            io.to(`order-${orderId}`).emit('delivery-complete', {
                partnerId,
                orderId,
                status: 'DELIVERED',
                deliveryProof: photo,
                notes,
                timestamp: new Date()
            });
            
            // Clean up tracking
            delete deliveryTracking[orderId];
        });

        // Vendor marks order as ready for pickup
        socket.on('food-ready', (data) => {
            const { orderId, vendorId, vendorName } = data;
            console.log(`🍽️ Food ready! Order ${orderId} from vendor ${vendorName}`);
            
            // Emit to all connected riders (not assigned yet)
            io.emit('food-ready-alert', {
                orderId,
                vendorId,
                vendorName,
                message: `Food is ready for pickup at ${vendorName}!`,
                timestamp: new Date()
            });
        });

        // Rider acknowledges food ready alert
        socket.on('acknowledge-food-ready', (data) => {
            const { partnerId, orderId } = data;
            console.log(`✓ Rider ${partnerId} acknowledged food ready for order ${orderId}`);
            
            io.emit('rider-acknowledged', {
                partnerId,
                orderId,
                timestamp: new Date()
            });
        });

        // Delivery partner marks order as unable to deliver
        socket.on('delivery-partner-unable-to-deliver', (data) => {
            const { partnerId, orderId, reason } = data;
            console.log(`❌ Partner ${partnerId} unable to deliver order ${orderId}: ${reason}`);
            
            io.to(`order-${orderId}`).emit('delivery-failed', {
                partnerId,
                orderId,
                reason,
                timestamp: new Date()
            });
        });

        // ======================== USER EVENTS ========================

        // User joins order tracking room
        socket.on('join-order-tracking', (data) => {
            const { orderId, userId, role } = data; // role: 'user', 'vendor', 'admin'
            socket.join(`order-${orderId}`);
            console.log(`👤 ${role} ${userId} joined tracking for order ${orderId}`);
            
            // Send current tracking info if available
            if (deliveryTracking[orderId]) {
                socket.emit('current-delivery-status', deliveryTracking[orderId]);
            }
        });

        // User leaves order tracking
        socket.on('leave-order-tracking', (data) => {
            const { orderId, userId } = data;
            socket.leave(`order-${orderId}`);
            console.log(`👤 User ${userId} left tracking for order ${orderId}`);
        });

        // User requests delivery partner details
        socket.on('request-partner-details', (data) => {
            const { orderId, partnerId } = data;
            
            // Emit request to partner
            io.to(`partner-${partnerId}`).emit('partner-details-requested', {
                orderId,
                requestedAt: new Date()
            });
        });

        // ======================== GENERAL EVENTS ========================

        // Handle errors
        socket.on('delivery-error', (data) => {
            const { partnerId, orderId, error } = data;
            console.error(`⚠️ Error from partner ${partnerId}: ${error}`);
            
            io.to(`order-${orderId}`).emit('delivery-error-notification', {
                partnerId,
                orderId,
                error,
                timestamp: new Date()
            });
        });

        // Ping-pong for connection check
        socket.on('ping', () => {
            socket.emit('pong');
        });

        // Disconnect handler
        socket.on('disconnect', () => {
            console.log('❌ User disconnected:', socket.id);
            
            // Notify about delivery partner going offline if applicable
            io.emit('delivery-partner-disconnected', {
                socketId: socket.id,
                timestamp: new Date()
            });
        });
    });
};

// ======================== HELPER FUNCTIONS ========================

// Calculate ETA based on distance (simple calculation)
function calculateETA(currentLocation, deliveryLocation = null) {
    // Simple ETA calculation: assume 30 km/h average speed
    // Distance in km / 30 km/h = hours * 60 = minutes
    const estimatedMinutes = Math.round(Math.random() * 30 + 5); // 5-35 minutes
    
    const eta = new Date();
    eta.setMinutes(eta.getMinutes() + estimatedMinutes);
    
    return {
        minutes: estimatedMinutes,
        estimatedTime: eta
    };
}

// Helper to notify nearby partners about new order
function notifyNearbyPartners(io, order, partners) {
    partners.forEach(partner => {
        io.to(`partner-${partner._id}`).emit('new-order-available', {
            orderId: order._id,
            location: order.userId.address,
            itemCount: order.products.length,
            estimatedEarning: 40,
            expiresIn: 30 // seconds to accept
        });
    });
}

module.exports.notifyNearbyPartners = notifyNearbyPartners;
