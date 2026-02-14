const expres = require("express");
const router = expres.Router();
const authcontroller = require("../controller/auth-controller")
const userController = require("../controller/user_controller");
const Vendor = require("../model/vendor");

router.route('/signup').post(authcontroller.signup);
router.route("/login").post(authcontroller.login);
router.route("/forgot-password").post(authcontroller.forgotPassword);
router.route("/reset-password").post(authcontroller.resetPassword);
router.route("/validate-reset-session").get(authcontroller.validateResetSession);

router.get('/user', userController.getAllUsers);
router.get('/user/:id', userController.getUserById);
router.put('/user/:id', userController.updateUser);

// Vendor Routes
router.get('/vendor/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    res.status(200).json(vendor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching vendor", error });
  }
});

router.put('/vendor/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { shopName, shopDescription, shopAddress, shopContactNumber, shopidentificationNumber } = req.body;

    console.log("Update request for vendor:", id);
    console.log("Data to update:", { shopName, shopDescription, shopAddress, shopContactNumber, shopidentificationNumber });

    // Update data with model field names
    const updateData = {};
    if (shopName) updateData.shopName = shopName;
    if (shopDescription) updateData.shopDescription = shopDescription;
    if (shopAddress) updateData.shopAddress = shopAddress;
    if (shopContactNumber) updateData.shopContactNumber = shopContactNumber;
    if (shopidentificationNumber) updateData.shopidentificationNumber = shopidentificationNumber;

    const vendor = await Vendor.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    console.log("Vendor updated successfully:", vendor);
    res.status(200).json({ message: "Vendor updated successfully", vendor });
  } catch (error) {
    console.error("Error updating vendor:", error);
    res.status(500).json({ message: "Error updating vendor", error: error.message });
  }
});

module.exports = router;