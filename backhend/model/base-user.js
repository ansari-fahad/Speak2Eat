const mongoose = require("mongoose");

const options = {
  discriminatorKey: "role",
  timestamps: true
};

const baseUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    },
    number: {
      type: String,
      unique: true
    }
  },
  options
);

module.exports = mongoose.model("BaseUser", baseUserSchema, "baseusers");
