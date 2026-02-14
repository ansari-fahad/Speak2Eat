const Product = require("../model/product");
const Category = require("../model/category");

const createProduct = async (req, res) => {
  console.log("req.headers:", req.headers);
  console.log("req.body:", req.body);
  console.log("req.file:", req.file);

  try {
    const { vendor_id, category_id, name, description, price, stock, ingredients } = req.body;

    console.log('📝 Creating product with vendor_id:', vendor_id);

    if (!vendor_id || !name) {
      return res.status(400).json({ message: "vendor_id and name are required" });
    }
    if (!price || price <= 0) {
      return res.status(400).json({ message: "Valid price is required" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Product image is required" });
    }

    const newProduct = new Product({
      vendor_id,
      category_id: category_id ? (Array.isArray(category_id) ? category_id : category_id.split(",")) : [],
      name,
      description: description || "",
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
      ingredients: ingredients ? (Array.isArray(ingredients) ? ingredients : ingredients.split(",")) : [],
      // image: "/" + req.file.path.replace(/\\/g, "/")
      image: "/" + req.file.path.replace(/\\/g, "/").replace(/^uploads\//i, "uploads/")
    });

    const savedProduct = await newProduct.save();

    // Update category item counts
    if (savedProduct.category_id && savedProduct.category_id.length > 0) {
      await Category.updateMany(
        { _id: { $in: savedProduct.category_id } },
        { $inc: { itemCount: 1 } }
      );
    }

    console.log('✅ Product saved successfully:', savedProduct);
    res.status(201).json({ message: "Product added successfully", product: savedProduct });
  } catch (err) {
    console.error("Error creating product:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getProductsByVendor = async (req, res) => {
  try {
    const { vendor_id } = req.params;
    console.log('🔍 Fetching products for vendor_id:', vendor_id);

    const products = await Product.find({ vendor_id });

    console.log('✅ Found', products.length, 'products for vendor:', vendor_id);
    console.log('📦 Products:', products);

    res.json(products);
  } catch (err) {
    console.error("Error fetching vendor products:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getProductsByCategory = async (req, res) => {
  try {
    const { category_id } = req.params;
    const products = await Product.find({ category_id: category_id });
    res.json(products);
  } catch (err) {
    console.error("Error fetching products by category:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock, category_id, ingredients } = req.body;

    console.log('📝 Updating product:', id);

    if (!name || !price) {
      return res.status(400).json({ message: "Name and price are required" });
    }

    const updateData = {
      name,
      description: description || "",
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
      category_id: category_id ? (Array.isArray(category_id) ? category_id : [category_id]) : [],
      ingredients: ingredients ? (Array.isArray(ingredients) ? ingredients : ingredients.split(",")) : []
    };

    // If a new image is uploaded, add it to update data
    if (req.file) {
      updateData.image = "/" + req.file.path.replace(/\\/g, "/").replace(/^uploads\//i, "uploads/");
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    console.log('✅ Product updated successfully:', updatedProduct);
    res.status(200).json({ message: "Product updated successfully", product: updatedProduct });
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { createProduct, getAllProducts, getProductsByVendor, getProductById, getProductsByCategory, updateProduct };


