const express = require("express");
const router = express.Router();
const orderController = require("../controller/order-controller");

router.post("/create", orderController.createOrder);
router.get("/ready/all", orderController.getReadyOrders);
router.get("/user/:userId", orderController.getOrdersByUserId);
router.get("/vendor/:vendorId/list", orderController.getOrdersList);
router.get("/vendor/:vendorId/formatted", orderController.getOrdersByVendorIdFormatted);
router.get("/vendor/:vendorId", orderController.getOrdersByVendorId);
router.get("/:orderId/locations", orderController.getOrderWithLocations);
router.put("/:orderId/status", orderController.updateOrderStatus);
router.put("/:orderId/ready", orderController.markOrderReady);
router.put("/:orderId/assign-rider", orderController.assignRiderToOrder);

module.exports = router;
