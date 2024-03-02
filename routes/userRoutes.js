const express = require('express');
const router = express.Router();
const authController = require('./../controllers/authController');
const userController = require('./../controllers/userController');
const { verifyToken } = require('../middlewares/verifyToken');
const accessibleFor = require('../middlewares/accessibleFor');

router.route('/register').post(authController.register);
router.route('/login').post(authController.login);
router.route('/logout').post(verifyToken, authController.logout);

router.route('/')
    .get(userController.getAllUsers);

router.route('/:id')
    .get(userController.getUser)
    .patch(verifyToken, accessibleFor(), userController.uploadPhoto, userController.updateUser)
    .delete(verifyToken, accessibleFor(), userController.deleteUser);

router.route('/update-me/:id')
    .patch(verifyToken, accessibleFor(), userController.uploadPhoto, userController.updateMe);


router.route('/delete-me/:id').delete(verifyToken, userController.deleteMyAccount);
router.route('/change-password/:id').patch(verifyToken, accessibleFor(), authController.changePassword);
router.route('/get-wishlist/:id').get(verifyToken, accessibleFor(), userController.getWishList);
router.route('/get-reviews/:id').get(verifyToken, userController.getReviews);
router.route('/forgot-password').post(authController.forgotPassword);
router.route('/reset-password/:token').patch(authController.resetPassword);

module.exports = router;