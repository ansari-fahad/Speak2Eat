const Cart = require("../model/cart");

const Product = require("../model/product");
const Vendor = require("../model/vendor");

const addToCart = async (req, res) => {
    try {
        const { userId, productId, vendorId, quantity, replaceCart } = req.body;

        let cart = await Cart.findOne({ userId });

        if (cart) {
            // Check if cart is not empty
            if (cart.products && cart.products.length > 0) {
                const existingVendorId = cart.products[0].vendorId.toString();

                // Check if vendor matches
                if (existingVendorId !== vendorId) {
                    if (replaceCart) {
                        // Discard old products and add new one
                        cart.products = [{ productId, vendorId, quantity }];
                    } else {
                        // Return message to ask user
                        return res.status(409).json({
                            message: "Cart contains products from a different vendor. Do you want to replace the cart?",
                            differentVendor: true
                        });
                    }
                } else {
                    // Same vendor: proceeds as usual
                    const existingProductIndex = cart.products.findIndex(
                        (p) => p.productId.toString() === productId
                    );

                    if (existingProductIndex > -1) {
                        // Increment quantity by 1 if product exists
                        cart.products[existingProductIndex].quantity += 1;
                    } else {
                        // Add new product if it doesn't exist
                        cart.products.push({ productId, vendorId, quantity });
                    }
                }
            } else {
                // Cart is empty, just add
                cart.products.push({ productId, vendorId, quantity });
            }

            const savedCart = await cart.save();
            res.status(200).json(savedCart);
        } else {
            // Create new cart if it doesn't exist
            const newCart = new Cart({
                userId,
                products: [{ productId, vendorId, quantity }]
            });

            const savedCart = await newCart.save();
            res.status(201).json(savedCart);
        }
    } catch (err) {
        console.error("Error adding to cart:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

const getCartByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        const cart = await Cart.findOne({ userId }).populate('products.productId').populate('products.vendorId');

        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }
        res.json(cart);
    } catch (err) {
        console.error("Error fetching cart:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

const updateCart = async (req, res) => {
    try {
        const { userId } = req.params;
        const { products, total } = req.body;

        const updatedCart = await Cart.findOneAndUpdate(
            { userId },
            { products, total },
            { new: true }
        ).populate('products.productId').populate('products.vendorId');

        if (!updatedCart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        res.json(updatedCart);
    } catch (err) {
        console.error("Error updating cart:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

const deleteCart = async (req, res) => {
    try {
        const { userId } = req.params;
        const deletedCart = await Cart.findOneAndDelete({ userId });

        if (!deletedCart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        res.json({ message: "Cart deleted successfully" });
    } catch (err) {
        console.error("Error deleting cart:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

module.exports = { addToCart, getCartByUserId, updateCart, deleteCart };
