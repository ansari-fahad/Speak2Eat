const express = require("express");
const router = express.Router();
const historyController = require("../controller/history-controller");

router.post("/add", historyController.addToHistory);
router.get("/:userId", historyController.getHistoryByUserId);

module.exports = router;
