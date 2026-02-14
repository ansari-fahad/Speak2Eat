const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Product = require("./model/product");
const Category = require("./model/category");

dotenv.config();

const repairDB = async () => {
    try {
        await mongoose.connect(process.env.MONOGO_URI || process.env.MONGO_URI || "mongodb://localhost:27017/food_delivery_app");
        console.log("MongoDB connected");

        // 1. Get all valid category IDs
        const categories = await Category.find({}, '_id name');
        const validCategoryIds = new Set(categories.map(c => c._id.toString()));
        const defaultCategoryId = categories[0]._id.toString(); // Use the first one (e.g. Burgers) as default
        console.log(`Loaded ${categories.length} valid categories.`);

        // 2. Scan Products
        const products = await Product.find();
        let updatedCount = 0;

        for (const p of products) {
            let needsSave = false;
            const currentCatIds = p.category_id || [];
            const newCatIds = [];

            // Check each category ID on the product
            for (const catId of currentCatIds) {
                if (validCategoryIds.has(catId)) {
                    newCatIds.push(catId);
                } else {
                    console.log(`Product "${p.name}" has invalid/orphan category ID: ${catId}`);
                    needsSave = true;
                }
            }

            // If array is empty after filtering (or was empty), assign default
            if (newCatIds.length === 0) {
                console.log(`Product "${p.name}" has no valid category. Assigning to "${categories[0].name}"`);
                newCatIds.push(defaultCategoryId);
                needsSave = true;
            } else if (needsSave) {
                // If we had some valid ones but removed invalid ones, just update.
                console.log(`Product "${p.name}" cleaned up.`);
            }

            if (needsSave) {
                p.category_id = newCatIds;
                await p.save();
                updatedCount++;
            }
        }

        console.log(`Repaired ${updatedCount} products.`);

        // 3. Sync Counts (Recalculate metadata)
        console.log("Syncing category counts...");
        for (const cat of categories) {
            const count = await Product.countDocuments({ category_id: cat._id.toString() });
            if (cat.itemCount !== count) {
                console.log(`Updating ${cat.name}: ${cat.itemCount} -> ${count}`);
                cat.itemCount = count;
                await cat.save();
            }
        }

        console.log("Database repair complete!");
        process.exit(0);

    } catch (err) {
        console.error("Error repairing DB:", err);
        process.exit(1);
    }
};

repairDB();
