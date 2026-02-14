const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require("../model/user");
const Admin = require("../model/admin");
const Vendor = require("../model/vendor");
const DeliveryPartner = require("../model/delivery-partner");
const BaseUser = require("../model/base-user");
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
});


const signup = async (req, res) => {
  try {
    // Check email
    const existingEmail = await BaseUser.findOne({ email: req.body.email });
    if (existingEmail) {
      return res.status(409).json({ message: "Email already exists" });
    }

    // Check phone number
    const existingPhone = await User.findOne({ number: req.body.phone });
    if (existingPhone) {
      return res.status(409).json({ message: "Phone number already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    let newUser;

    // Create user based on role
    switch (req.body.role) {
      case "admin":
        newUser = new Admin({
          email: req.body.email,
          name: req.body.name,
          password: hashedPassword,
          number: req.body.phone,
          permissions: req.body.permissions || []
        });
        break;

      case "vendor":
        newUser = new Vendor({
          email: req.body.email,
          name: req.body.name,
          password: hashedPassword,
          number: req.body.phone,
          shopName: req.body.shopName || "My Shop"
        });

        if (await Vendor.countDocuments() > 0) {
          const lastEntry = await Vendor.findOne().sort({ shopidentificationNumber: -1 }).exec();
          const [prefix, number] = lastEntry.shopidentificationNumber.split("-");
          newUser.shopidentificationNumber = `${prefix}-${Number(number) + 1}`;
        }

        break;

      case "rider":
        // Create DeliveryPartner without delivery details
        // Details will be collected after login in the dashboard
        newUser = new DeliveryPartner({
          email: req.body.email,
          name: req.body.name,
          password: hashedPassword,
          phone: req.body.phone,  // Fixed: use 'phone' not 'number'
          // Delivery details NOT collected at signup - use valid defaults
          vehicleType: 'bike',  // Default valid enum value
          vehicleNumber: '',
          licenseNumber: '',
          aadharNumber: '',
          bankAccountNumber: '',
          bankIfsc: '',
          bankHolderName: '',
          profileComplete: false  // Flag to indicate pending profile completion
        });
        break;

      default: // normal user
        newUser = new User({
          email: req.body.email,
          name: req.body.name,
          password: hashedPassword,
          number: req.body.phone,
          address: req.body.address || {}
        });
    }

    // Save user
    await newUser.save();

    res.status(201).json({
      message: "User created successfully",
      user: newUser
    });
  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
};


const login = async (req, res) => {
  try {
    // 1. Find user
    const user = await BaseUser.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({ message: " Email not found" });
    }

    // 2. Check password
    const isMatch = await bcrypt.compare(req.body.password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Wrong password" });
    }

    // 3. Create JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET
    );

    res.json({
      message: "Login successful",
      token: token,
      userId: user._id,
      user: user.name,
      role: user.role
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}



// module.exports = { signup, login };
const getUser = async (req, res) => {
  try {
    const user = await BaseUser.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await BaseUser.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ message: "Email not found" });
    }
    const emailTemplate = `
    <div style="background-color: #FDFDFD; padding: 40px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 32px; padding: 45px; box-shadow: 0 20px 60px -10px rgba(0, 0, 0, 0.08); text-align: center;">
          <div style="margin-bottom: 20px; display: inline-block;">
              <span style="font-size: 32px; vertical-align: middle;">🍲</span>
              <span style="font-weight: 800; font-size: 26px; color: #1E272E; vertical-align: middle; margin-left: 10px;">Foodio</span>
          </div>
          
          <h2 style="font-family: 'Georgia', serif; font-size: 32px; color: #1A1A1A; margin-bottom: 15px; margin-top: 0;">Reset Password</h2>
          
          <p style="color: #636E72; font-size: 16px; margin-bottom: 30px; line-height: 1.5;">
              You requested to reset your password. Click the button below to proceed.
          </p>

          <!-- Table based button for better email support -->
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td align="center" bgcolor="#1E272E" style="border-radius: 20px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);">
                <a href="http://localhost:4200/reset-password" target="_blank" style="padding: 18px 40px; border-radius: 20px; font-family: 'Segoe UI', sans-serif; font-size: 18px; font-weight: bold; color: #ffffff; text-decoration: none; display: inline-block; border: 1px solid #1E272E;">
                  Reset Password
                </a>
              </td>
            </tr>
          </table>
          
          <div style="margin-top: 30px; border-top: 1px solid #EEE; padding-top: 20px; color: #AAA; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
              Foodio Inc.
          </div>
      </div>
    </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Reset Your Password - Foodio",
      html: emailTemplate
    });

    // Save the email in session for 5 min
    req.session.resetEmail = email;
    req.session.cookie.maxAge = 5 * 60 * 1000; // 5 minutes
    console.log(req.session);
    console.log(`[ForgotPassword] Session ID: ${req.sessionID}`);
    console.log(`[ForgotPassword] Helper saved email to session: ${email}`);

    // Explicitly save session to ensure it persists before response
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Session error" });
      }
      res.status(200).json({
        message: "Password reset link sent to your email.",
        email: email
      });
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    console.log(`[ResetPassword] Session ID: ${req.sessionID}`);
    console.log(`[ResetPassword] Session Data:`, req.session);

    const email = req.session.resetEmail;

    if (!email) {
      console.log("[ResetPassword] No email found in session.");
      return res.status(400).json({ message: "Session expired or invalid. Please request a new password reset." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await BaseUser.findOneAndUpdate(
      { email: email },
      { password: hashedPassword }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Clear session
    req.session.resetEmail = null;
    req.session.save();

    res.status(200).json({ message: "Password reset successfully." });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const validateResetSession = async (req, res) => {
  try {
    console.log(`[ValidateSession] Session ID: ${req.sessionID}`);
    console.log(`[ValidateSession] Session Data:`, req.session);

    if (req.session && req.session.resetEmail) {
      console.log("[ValidateSession] Valid session found for:", req.session.resetEmail);
      return res.status(200).json({ valid: true, message: "Session is valid" });
    } else {
      console.log("[ValidateSession] No valid reset session found.");
      return res.status(401).json({ valid: false, message: "Session expired or invalid" });
    }
  } catch (error) {
    console.error("[ValidateSession] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { signup, login, getUser, forgotPassword, resetPassword, validateResetSession };