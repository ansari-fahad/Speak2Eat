require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");

// Import all routers with adjusted paths
const authrouter = require("../router/auth-router");
const categoryrouter = require("../router/category-router");
const vendorRouter = require("../router/vendor-router");
const deliveryPartnerRouter = require("../router/delivery-partner-router");
const cartRouter = require("../router/cart-router");
const historyRouter = require("../router/history-router");
const orderRouter = require("../router/order-router");
const adminRouter = require("../router/admin-router");
const accountRouter = require("../router/account-router");
const withdrawalRouter = require("../router/withdrawal-router");
const paymentRouter = require("../router/payment-router");
const productRouter = require("../router/product-router");

const app = express();

app.use(cors({
    origin: '*', // Allow all origins for Vercel deployment
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Mock socket.io middleware to prevent crashes
app.use((req, res, next) => {
    req.io = {
        emit: (event, data) => {
            // Socket.io is not supported in serverless functions
            // silently ignore or log
            // console.log('Socket event emitted:', event); 
        },
        to: (room) => {
            return {
                emit: (event, data) => {
                    // console.log(`Socket event emitted to ${room}:`, event);
                }
            }
        }
    };
    next();
});

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'foodio_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONOGO_URI || process.env.MONGODB_URI,
        collectionName: 'sessions'
    }),
    cookie: {
        secure: true, // Always true for Vercel
        sameSite: 'none', // Allow cross-site usage
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// Serverless-safe DB connection
let isConnected = false;

async function connectDB() {
    if (isConnected) return;
    try {
        // Note: Using MONOGO_URI as defined in .env
        await mongoose.connect(process.env.MONOGO_URI || process.env.MONGODB_URI);
        isConnected = true;
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection error:", error);
    }
}

// Connect DB when any request comes
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

app.get("/", (req, res) => {
    res.send("MongoDB connected 🚀");
});

// API Routes
app.use("/api/auth", authrouter);
app.use("/api/category", categoryrouter);
app.use("/api/vendor", vendorRouter);
app.use("/api/delivery-partner", deliveryPartnerRouter);
app.use("/api/cart", cartRouter);
app.use("/api/history", historyRouter);
app.use("/api/order", orderRouter);
app.use("/api/admin", adminRouter);
app.use("/api/account", accountRouter);
app.use("/api/withdrawals", withdrawalRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/products", productRouter);

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

module.exports = app;
