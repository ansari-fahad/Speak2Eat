const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONOGO_URI).then(async () => {
    const Product = require('./model/product');
    
    try {
        // Update using updateMany with aggregation pipeline
        const result = await Product.updateMany(
            { image: { $regex: '\\\\' } },
            [
                {
                    $set: {
                        image: { 
                            $concat: [
                                '/',
                                {
                                    $replaceAll: {
                                        input: '$image',
                                        find: '\\',
                                        replacement: '/'
                                    }
                                }
                            ]
                        }
                    }
                }
            ]
        );
        
        console.log('Database update result:', result);
        
        // Verify the changes
        const allProducts = await Product.find();
        console.log('\n=== PRODUCTS AFTER UPDATE ===');
        allProducts.forEach(p => console.log('Name:', p.name, '| Image:', p.image));
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}).catch(err => {
    console.error('DB Connection Error:', err.message);
    process.exit(1);
});
