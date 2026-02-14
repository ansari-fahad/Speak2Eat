// models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    vendor_id: {
     type: String,
      ref: "BaseUser", // vendor is a user
      required: true
    },

    category_id: [{
      type: String,
      ref: "Category",
      required: true
    }],

    name: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      trim: true
    },

    image: {
      type: String, // file path or cloud URL
      required: true
    },

    price: {
      type: Number,
      required: true,
      min: 0
    },

    stock: {
      type: Number,
      default: 0,
      min: 0
    },

    ingredients: [{
      type: String,
      trim: true
    }],

    createdAt: {
      type: Date,
      default: Date.now
    }
  }
);


module.exports = mongoose.model("Product", productSchema);
