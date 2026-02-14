const mongoose = require("mongoose");
const BaseUser = require("./base-user");
const userSchema = new mongoose.Schema({
  address: {
    street: {
      type: String,
      default: " "
    },
    city: {
      type: String,
      default: " "
    },
    state: {
      type: String,
      default: " "
    },
    postalCode: {
      type: String,
      default: " "
    },
    country: {
      type: String,
      default: "India"
    }
  }
});

const User = BaseUser.discriminator("user", userSchema);
module.exports = User;
