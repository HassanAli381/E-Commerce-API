const express = require('express');
const router = express.Router();
const categoriesController = require('./../controllers/categoriesController');
const { verifyToken } = require('../middlewares/verifyToken');
const accessibleFor = require('../middlewares/accessibleFor');

router.route('/')
    .get(categoriesController.getAllCategories)
    .post(verifyToken, accessibleFor(), categoriesController.addCategory);

router.route('/:id')
    .get(categoriesController.getCategory)
    .patch(verifyToken, accessibleFor(), categoriesController.updateCategory)
    .delete(verifyToken, accessibleFor(), categoriesController.deleteCategory);


module.exports = router;