const category = require('../model/category');


const addcategory = async (req, res) => {
  try {
    const { name } = req.body;

    const newCategory = new category({ name });
    await newCategory.save();
    res.status(201).json({ message: 'Category added successfully', category: newCategory });
  } catch (error) {
    res.status(500).json({ message: 'Error adding category', error: error.message });
  }
};

const Product = require('../model/product');

const getAllCategories = async (req, res) => {
  try {
    const categories = await category.find();

    // Add real product counts to each category
    const categoriesWithCounts = await Promise.all(categories.map(async (cat) => {
      // Check if products contain this category's ID (cast to string to be safe)
      const count = await Product.countDocuments({ category_id: cat._id.toString() });
      console.log(`Category: ${cat.name}, Count: ${count}`);
      return {
        ...cat.toObject(),
        realCount: count
      };
    }));

    res.status(200).json(categoriesWithCounts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
};


module.exports = { addcategory, getAllCategories };