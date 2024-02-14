const express = require('express');
const router = express.Router();
const paymentController = require('./../controllers/paymentController');
const { verifyToken } = require('../middlewares/verifyToken');


router.get('/checkout-session/:id', verifyToken, paymentController.getCheckoutSession);


module.exports = router;