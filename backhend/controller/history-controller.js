const History = require("../model/history");

// Add specific order to history
const addToHistory = async (req, res) => {
    try {
        const { userId, products, total } = req.body;

        const newHistory = new History({
            userId,
            products,
            total
        });

        const savedHistory = await newHistory.save();
        res.status(201).json(savedHistory);
    } catch (err) {
        console.error("Error adding to history:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get all history/orders for a user
const getHistoryByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        const history = await History.find({ userId })
            .populate('products.productId')
            .populate('products.vendorId')
            .sort({ orderDate: -1 }); // Newest first

        if (!history) {
            return res.status(404).json({ message: "No history found" });
        }
        res.json(history);
    } catch (err) {
        console.error("Error fetching history:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

module.exports = { addToHistory, getHistoryByUserId };
