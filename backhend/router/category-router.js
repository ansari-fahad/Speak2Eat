const expres = require("express");
const router = expres.Router();
const categorycontroller = require("../controller/category-controller");


// const categorycontroller = require("../controller/category-controller")
// router.route('/signup').post(authcontroller.signup);
// router.route("/login").post(authcontroller.login)

router.post('/add-category', categorycontroller.addcategory);
router.get('/', categorycontroller.getAllCategories);


module.exports = router;