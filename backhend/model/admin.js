const mongoose = require("mongoose");
const BaseUser = require("./base-user");
const adminSchema = new mongoose.Schema({
  permissions: {
    type: [String],
    default: []
  }
});
const Admin = BaseUser.discriminator("admin", adminSchema);

module.exports = Admin;