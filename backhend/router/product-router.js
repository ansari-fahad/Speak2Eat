const express = require("express");
const router = express.Router();
const productController = require("../controller/product-Controller");
const upload = require("../middleware/upload");
const Product = require("../model/product");
console.log("Product Router Loaded!");
// ✅ GET all products
router.get("/all", async (req, res) => {
  try {
    const products = await Product.find().populate("vendor_id", "shopName");

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ✅ GET product by ID
router.get("/id/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    res.status(400).json({ message: "Invalid ID" });
  }
});

// ✅ CREATE product (with image upload)
// Wrap multer so upload errors return JSON (otherwise Express may send HTML -> "Unexpected token '<'")
const uploadProductImage = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "Image upload failed"
      });
    }
    next();
  });
};

router.post("/add-products", uploadProductImage, productController.createProduct);

// ✅ GET products by vendor
router.get("/vendor/:vendor_id", productController.getProductsByVendor);

// ✅ GET products by category
router.get("/category/:category_id", productController.getProductsByCategory);

// DELETE product by ID
router.delete("/:id", async (req, res) => {
  try {
    const productId = req.params.id;

    const deletedProduct = await Product.findByIdAndDelete(productId);

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      deletedProduct
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error deleting product",
      error: err.message
    });
  }
});


// UPDATE product by ID (with optional image upload)
router.put("/:id", upload.single("image"), productController.updateProduct);

module.exports = router;
