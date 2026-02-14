const express = require("express");
const mongoose = require("mongoose");
const app = express();
require('dotenv').config();
const cors = require("cors");
const path = require("path");


const authrouter = require("./router/auth-router");
const categoryrouter = require("./router/category-router");
const vendorRouter = require("./router/vendor-router");
const deliveryPartnerRouter = require("./router/delivery-partner-router");
// const productRouter = require("./router/product-router"); // handles file uploads
const cartRouter = require("./router/cart-router");
const historyRouter = require("./router/history-router");
const orderRouter = require("./router/order-router");
const adminRouter = require("./router/admin-router");
const accountRouter = require("./router/account-router");
const withdrawalRouter = require("./router/withdrawal-router");

const PORT = 3000;

// CORS
app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:4201'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

const session = require('express-session');
app.use(session({
  secret: process.env.SESSION_SECRET || 'foodio_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // secure: true for https
}));

// Serve static files (uploaded images)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Only parse JSON for routes that need it (non-file routes)
app.use("/api/auth", express.json(), authrouter);
app.use("/api/category", express.json(), categoryrouter);
app.use("/api/vendor", express.json(), vendorRouter);
app.use("/api/delivery-partner", express.json(), deliveryPartnerRouter);
app.use("/api/cart", express.json(), cartRouter);
app.use("/api/history", express.json(), historyRouter);
app.use("/api/order", express.json(), orderRouter);
app.use("/api/admin", express.json(), adminRouter);
app.use("/api/account", express.json(), accountRouter);
app.use("/api/withdrawals", express.json(), withdrawalRouter);
app.use("/api/payment", express.json(), require("./router/payment-router"));

// Product route: Multer handles multipart/form-data
app.use("/api/products", require("./router/product-router"));
// app.use("/api/product", require("./router/product-router"));
// MongoDB connection
const Category = require("./model/category");

const http = require('http');
const { Server } = require("socket.io");
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:4200', 'http://localhost:4201'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

// MongoDB connection
mongoose.connect(process.env.MONOGO_URI)
  .then(async () => {
    console.log("MongoDB connected");

    // Seed Categories
    try {
      const existingCategories = await Category.find();
      if (existingCategories.length > 0) {
        console.log("Categories are up to date");
      }
      else {
        const defaultCategories = [
          { name: "Burgers", icon: "🍔", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80", itemCount: 0 },
          { name: "Pizza", icon: "🍕", image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80", itemCount: 0 },
          { name: "Asian", icon: "🍜", image: "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=400&q=80", itemCount: 0 },
          { name: "Desserts", icon: "🍰", image: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=400&q=80", itemCount: 0 },
          { name: "Healthy", icon: "🥗", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80", itemCount: 0 },
          { name: "Indian", icon: "🍛", image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=400&q=80", itemCount: 0 },
          { name: "Mexican", icon: "🌮", image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=400&q=80", itemCount: 0 },
          { name: "Beverages", icon: "🥤", image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=400&q=80", itemCount: 0 },
          { name: "Breakfast", icon: "🥞", image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=400&q=80", itemCount: 0 },
          { name: "Seafood", icon: "🦞", image: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=400&q=80", itemCount: 0 },
          { name: "BBQ & Grills", icon: "🍖", image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80", itemCount: 0 },
          { name: "Vegan", icon: "🌱", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80", itemCount: 0 },
          { name: "Pasta", icon: "🍝", image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=400&q=80", itemCount: 0 },
          { name: "Sandwiches", icon: "🥪", image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=400&q=80", itemCount: 0 },
          { name: "Soups", icon: "🍲", image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=400&q=80", itemCount: 0 },
          { name: "Salads", icon: "🥙", image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=400&q=80", itemCount: 0 },
          { name: "Chinese", icon: "🥟", image: "https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=400&q=80", itemCount: 0 },
          { name: "Japanese", icon: "🍱", image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=400&q=80", itemCount: 0 },
          { name: "Fast Food", icon: "🍟", image: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=400&q=80", itemCount: 0 },
          { name: "Coffee & Tea", icon: "☕", image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=80", itemCount: 0 }
        ];
        console.log("Default data is inserted ")
        await Category.insertMany(defaultCategories);
      }
    } catch (error) {
      console.error("Error seeding categories:", error);
    }
  })
  .catch(err => console.error(err));

// Debug endpoint - check database data
app.get('/api/debug/check-data/:vendorId', async (req, res) => {
  try {
    const Order = require('./model/order');
    const Withdrawal = require('./model/withdrawal');
    
    const { vendorId } = req.params;
    
    const orders = await Order.countDocuments({ "products.vendorId": vendorId });
    const transactions = await Withdrawal.countDocuments({ vendorId });
    
    res.json({
      vendorId,
      ordersCount: orders,
      transactionsCount: transactions,
      message: `Vendor ${vendorId} has ${orders} orders and ${transactions} transactions`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app; 
