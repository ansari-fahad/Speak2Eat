const mongoose = require("mongoose");

const categories = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  image: {
    type: String,
    required: true
  },
  icon: {
    type: String, // emoji stored as string
    required: true
  },
  itemCount: {
    type: Number, // better as Number, not String
    required: true
  }
});

module.exports = mongoose.model("Category", categories, "categories");
