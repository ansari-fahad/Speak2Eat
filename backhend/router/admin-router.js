const express = require('express');
const router = express.Router();
const adminController = require('../controller/admin-controller');

// GET /api/admin/dashboard-stats
router.get('/dashboard-stats', adminController.getAdminDashboardStats);
router.get('/users', adminController.getAllUsers);
router.get('/vendors', adminController.getAllVendors);
router.get('/products', adminController.getAllProducts);

// User CRUD
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Vendor CRUD
router.post('/vendors', adminController.createVendor);
router.put('/vendors/:id', adminController.updateVendor);
router.delete('/vendors/:id', adminController.deleteVendor);

// Rider CRUD
router.get('/riders', adminController.getAllRiders);
router.post('/riders', adminController.createRider);
router.put('/riders/:id', adminController.updateRider);
router.delete('/riders/:id', adminController.deleteRider);

// Product CRUD
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

module.exports = router;
