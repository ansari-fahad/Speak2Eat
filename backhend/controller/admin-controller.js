const User = require('../model/user');
const Vendor = require('../model/vendor');
const DeliveryPartner = require('../model/delivery-partner');
const Product = require('../model/product');
const Order = require('../model/order');
const bcrypt = require('bcryptjs');

// Helper to calculate growth
async function getGrowthStats(Model, dateField = 'createdAt') {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const currentTotal = await Model.countDocuments();
    const lastMonthTotal = await Model.countDocuments({
        [dateField]: { $lt: lastMonth }
    });

    const growth = lastMonthTotal === 0 ? (currentTotal > 0 ? 100 : 0) : ((currentTotal - lastMonthTotal) / lastMonthTotal) * 100;

    return {
        total: currentTotal,
        growth: Math.round(growth * 10) / 10
    };
}

// Helper for Revenue Growth
async function getRevenueStats() {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const aggregateRevenue = async (dateLimit) => {
        const query = [];

        if (dateLimit) {
            query.push({ $match: { orderDate: { $lt: dateLimit } } });
        }

        query.push({
            $group: {
                _id: null,
                totalRevenue: { $sum: "$total" }
            }
        });

        const result = await Order.aggregate(query);
        return result.length > 0 ? result[0].totalRevenue : 0;
    };

    const currentTotal = await aggregateRevenue(null);
    const lastMonthTotal = await aggregateRevenue(lastMonth);

    const growth = lastMonthTotal === 0 ? (currentTotal > 0 ? 100 : 0) : ((currentTotal - lastMonthTotal) / lastMonthTotal) * 100;

    return {
        total: currentTotal,
        growth: Math.round(growth * 10) / 10
    };
}

exports.getAdminDashboardStats = async (req, res) => {
    try {
        const usersStats = await getGrowthStats(User, 'createdAt');
        const vendorsStats = await getGrowthStats(Vendor, 'createdAt');
        const productsStats = await getGrowthStats(Product, 'createdAt');
        const ordersStats = await getGrowthStats(Order, 'orderDate');
        const revenueStats = await getRevenueStats();

        const activeOrders = await Order.countDocuments({ status: { $in: ['Preparing', 'Out for Delivery', 'Confirmed'] } });
        const pendingVendors = await Vendor.countDocuments({ status: 'pending' }); // Assuming we might add status later, or it's 0

        const recentOrders = await Order.find()
            .sort({ orderDate: -1 })
            .limit(5)
            .populate('userId', 'email')
            .populate('products.productId', 'name');

        res.status(200).json({
            success: true,
            data: {
                totalUsers: usersStats.total,
                userGrowth: usersStats.growth,
                totalVendors: vendorsStats.total,
                vendorGrowth: vendorsStats.growth,
                totalProducts: productsStats.total,
                productGrowth: productsStats.growth,
                totalOrders: ordersStats.total,
                orderGrowth: ordersStats.growth,
                totalRevenue: revenueStats.total,
                revenueGrowth: revenueStats.growth,
                activeOrders,
                pendingVendors,
                recentOrders
            }
        });
    } catch (error) {
        console.error("Error fetching admin dashboard stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve dashboard statistics",
            error: error.message
        });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        // Aggregate to get user details + total orders + total spent
        const users = await User.aggregate([
            { $match: { role: 'user' } }, // Explicitly match users
            {
                $lookup: {
                    from: 'orders',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'orders'
                }
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    number: 1,
                    createdAt: 1,
                    role: 1,
                    totalOrders: { $size: '$orders' },
                    totalSpent: { $sum: '$orders.total' }
                }
            }
        ]);

        res.status(200).json({ success: true, data: users });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ success: false, message: "Failed to fetch users", error: error.message });
    }
};

exports.getAllVendors = async (req, res) => {
    try {
        const vendors = await Vendor.aggregate([
            { $match: { role: 'vendor' } },
            {
                $lookup: {
                    from: 'orders',
                    let: { vendorId: '$_id' },
                    pipeline: [

                        // Check if any product in the order belongs to this vendor
                        { $match: { $expr: { $in: ['$$vendorId', '$products.vendorId'] } } }
                    ],
                    as: 'vendorOrders'
                }
            },
            {

                $addFields: {
                    vendorIdString: { $toString: '$_id' }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'vendorIdString',
                    foreignField: 'vendor_id', // product.vendor_id is String
                    as: 'productsList'
                }
            },
            // Note: Product schema has vendor_id as string or ObjectId?  
            // In product.js: vendor_id: { type: String, ref: "BaseUser" }
            // If it's stored as String in Product but ObjectId in Vendor, lookup naturally fails without conversion.
            // However, usually mongoose stores refs as ObjectIds. The schema said 'type: String' previously.
            // Let's assume standard behavior or fix if empty.
            {
                $project: {
                    name: 1,
                    email: 1,
                    shopName: 1,
                    shopCategory: 1, // field might be missing in schema, check schema
                    createdAt: 1,
                    totalProducts: { $size: '$productsList' },
                    totalOrders: { $size: '$vendorOrders' },
                    // Revenue approximation: Sum of totals of orders containing this vendor
                    // IMPORTANT: This overcounts if an order has multiple vendors. 
                    // For now, it's a reasonable approximation for a dashboard.
                    revenue: { $sum: '$vendorOrders.total' },
                    rating: { $literal: 4.5 }, // Placeholder as rating schema might not be fully set
                    status: { $literal: 'active' } // Placeholder if no status field
                }
            }
        ]);

        res.status(200).json({ success: true, data: vendors });
    } catch (error) {
        console.error("Error fetching vendors:", error);
        res.status(500).json({ success: false, message: "Failed to fetch vendors", error: error.message });
    }
};

exports.getAllProducts = async (req, res) => {
    try {
        // Simple populate for products
        const products = await Product.find()
            .populate('vendor_id', 'shopName name')
            .lean(); // Convert to plain JS objects

        // Map to format
        const formattedProducts = products.map(p => ({
            _id: p._id,
            name: p.name,
            category: p.category_id, // This is an array or string? Schema says array of strings or refs
            price: p.price,
            stock: p.stock,
            image: p.image,
            vendor_id: p.vendor_id ? p.vendor_id._id : null,
            vendorName: p.vendor_id ? (p.vendor_id.shopName || p.vendor_id.name) : 'Unknown Vendor',
            sales: 0, // Placeholder, would need order aggregation
            status: p.stock > 0 ? 'active' : 'inactive'
        }));

        res.status(200).json({ success: true, data: formattedProducts });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ success: false, message: "Failed to fetch products", error: error.message });
    }
};

// --- USER CRUD ---
exports.createUser = async (req, res) => {
    try {
        const { name, email, password, phone, address } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword, number: phone, address });
        await newUser.save();
        res.status(201).json({ success: true, data: newUser });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { password, ...updateData } = req.body;
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }
        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "User deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- VENDOR CRUD ---
exports.createVendor = async (req, res) => {
    try {
        const { name, email, password, phone, shopName, shopCategory } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newVendor = new Vendor({
            name, email, password: hashedPassword, number: phone, shopName, shopCategory,
            status: 'active' // Auto-activate if created by admin
        });

        // Generate shop ID
        if (await Vendor.countDocuments() > 0) {
            const lastEntry = await Vendor.findOne().sort({ shopidentificationNumber: -1 }).exec();
            if (lastEntry && lastEntry.shopidentificationNumber) {
                const [prefix, number] = lastEntry.shopidentificationNumber.split("-");
                newVendor.shopidentificationNumber = `${prefix}-${Number(number) + 1}`;
            } else {
                newVendor.shopidentificationNumber = 'shp-1';
            }
        } else {
            newVendor.shopidentificationNumber = 'shp-1';
        }

        await newVendor.save();
        res.status(201).json({ success: true, data: newVendor });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.updateVendor = async (req, res) => {
    try {
        const { password, ...updateData } = req.body;
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }
        const vendor = await Vendor.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.status(200).json({ success: true, data: vendor });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.deleteVendor = async (req, res) => {
    try {
        await Vendor.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Vendor deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- RIDER (Rules/DeliveryPartner) CRUD ---
exports.getAllRiders = async (req, res) => {
    try {
        const riders = await DeliveryPartner.find({ role: 'rider' });
        res.status(200).json({ success: true, data: riders });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch riders', error: error.message });
    }
};

exports.createRider = async (req, res) => {
    try {
        const { name, email, password, phone, vehicleType, vehicleNumber } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newRider = new DeliveryPartner({
            name, email, password: hashedPassword, phone, vehicleType, vehicleNumber,
            profileComplete: true,
            isAvailable: true
        });
        await newRider.save();
        res.status(201).json({ success: true, data: newRider });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.updateRider = async (req, res) => {
    try {
        const { password, ...updateData } = req.body;
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }
        const rider = await DeliveryPartner.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.status(200).json({ success: true, data: rider });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.deleteRider = async (req, res) => {
    try {
        await DeliveryPartner.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Rider deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- PRODUCT CRUD ---
exports.createProduct = async (req, res) => {
    try {
        // Simple create assuming JSON body. 
        // For real file upload, use multer middleware on the route.
        const product = new Product(req.body);
        await product.save();
        res.status(201).json({ success: true, data: product });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, data: product });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Product deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
