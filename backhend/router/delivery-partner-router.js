const express = require("express");
const router = express.Router();
const deliveryPartnerController = require("../controller/delivery-partner-controller");

// ======================== DELIVERY PARTNER MANAGEMENT ========================
router.post("/create", deliveryPartnerController.createDeliveryPartner);

// ======================== PROFILE COMPLETION (SPECIFIC ROUTES FIRST) ========================
router.put("/:id/delivery-info", deliveryPartnerController.updateDeliveryInformation);
router.put("/:id/online-status", deliveryPartnerController.toggleOnlineStatus);
router.put("/:id/location", deliveryPartnerController.updateLocation);
router.get("/:id/earnings", deliveryPartnerController.getEarningsSummary);
router.get("/:partnerId/pending-orders", deliveryPartnerController.getPendingOrders);
router.get("/:partnerId/orders", deliveryPartnerController.getAllOrders);

// ======================== GENERIC ROUTES (AFTER SPECIFIC ONES) ========================
router.get("/:id", deliveryPartnerController.getDeliveryPartnerById);
router.put("/:id", deliveryPartnerController.updateDeliveryPartner);

router.post("/:partnerId/assign-order", deliveryPartnerController.assignOrderToPartner);
router.post("/:partnerId/orders/:orderId/accept", deliveryPartnerController.acceptOrder);
router.post("/:partnerId/orders/:orderId/reject", deliveryPartnerController.rejectOrder);
router.post("/:partnerId/orders/:orderId/deliver", deliveryPartnerController.markOrderDelivered);

module.exports = router;
