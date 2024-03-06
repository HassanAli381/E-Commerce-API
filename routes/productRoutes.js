const router = require('express').Router();
const { verifyToken } = require('../middlewares/verifyToken');
const prodctController = require('./../controllers/productController');
const accessibleFor = require('../middlewares/accessibleFor');
const userController = require('./../controllers/userController');

router.route('/:id')
    .get(prodctController.getProduct)
    .patch(verifyToken, accessibleFor(), userController.uploadPhoto, prodctController.updateProduct)
    .delete(verifyToken, accessibleFor(), prodctController.deleteProduct);

router.route('/')
    .get(prodctController.getAllProducts)
    .post(verifyToken, userController.uploadPhoto, prodctController.addProduct);

router.route('/add-prod-to-wishlist/:id')
    .post(verifyToken, prodctController.addProductToWishList);

router.route('/remove-prod-from-wishlist/:id')
    .delete(verifyToken, prodctController.removeProdFromWishList);

router.route('/update-my-product/:id').patch(verifyToken, userController.uploadPhoto, prodctController.updateMyProduct);
router.route('/delete-my-product/:id').delete(verifyToken, prodctController.deleteMyProduct);

router.route('/search/:searchKeyword').get(prodctController.searchForProduct);

module.exports = router;