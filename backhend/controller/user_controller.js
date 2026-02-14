const BaseUser = require('../model/base-user');


const getUserById = async (req, res) => {
  try {
    const user = await BaseUser.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const getAllUsers = async (req, res) => {
  try {
    const users = await BaseUser.find().select('-password');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address } = req.body;

    // 1. Find the user document first
    // Mongoose discriminators: finding by BaseUser returns the correct subclass instance (User, Vendor, etc.)
    const user = await BaseUser.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.number = phone;

    // Address is specific to 'user' role (User model)
    // Since 'user' variable is an instance of User (if role is user), it should have the address field in its schema
    if (address && user.role === 'user') {
      // Merge or overwrite address fields
      user.address = {
        ...user.address, // keep existing sub-fields if any (though normally we replace for simplicity or use what's passed)
        ...address
      };
    }

    // 3. Save the document (triggers validation and updates)
    await user.save();

    // Return the updated user (exclude password)
    const updatedUser = user.toObject();
    delete updatedUser.password;

    console.log("User updated:", updatedUser);

    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getUserById, getAllUsers, updateUser };
