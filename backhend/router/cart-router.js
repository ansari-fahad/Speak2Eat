const express = require("express");
const router = express.Router();
const cartController = require("../controller/cart-controller");

router.post("/create", cartController.addToCart);
router.get("/:userId", cartController.getCartByUserId);
router.put("/:userId", cartController.updateCart);
router.delete("/:userId", cartController.deleteCart);

module.exports = router;
