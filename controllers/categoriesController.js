const asyncWrapper = require('express-async-handler');
const Category = require('../models/categoryModel');
const validateObjectID = require('./../utils/validateObjectID');
const AppError = require('../utils/AppError');
const { SUCCESS, FAIL } = require('./../utils/responseText');


exports.addCategory = asyncWrapper(async (req, res, next) => {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json({
        status: SUCCESS, 
        requestedAt: req.requestedAt,
        data: {
            category
        }
    });
});

exports.getAllCategories = asyncWrapper(async(req, res) => {
    const categories = await Category.find({}).select('-__v');

    res.status(200).json({
        status: SUCCESS, 
        requestedAt: req.requestedAt,
        results: categories.length,
        data: {
            categories
        }
    });
});

exports.getCategory = asyncWrapper(async(req, res, next) => {
    const { id } = req.params;
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        const error = AppError.createError('Invalid Object ID', 400, FAIL);
        return next(error);
    }

    const category = await Category.findOne({_id : id}).select('-__v');
    if(!category) {
        const error = AppError.createError('No such category', 404, FAIL);
        return next(error);
    }

    await category.populate({
        path: 'products',
        select: 'name price main_photo'
    });

    res.status(200).json({
        status: SUCCESS,
        requestedAt: req.requestedAt,
        data: {
            category
        }
    });

});

exports.updateCategory = asyncWrapper(async(req, res, next) => {
    const { id } = req.params;
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        const error = AppError.createError('Invalid Object ID', 400, FAIL);
        return next(error);
    }

    const category = await Category.findOne({_id : id});
    if(!category) {
        const error = AppError.createError('No such category', 404, FAIL);
        return next(error);
    }

    const newCategory = await Category.findOneAndUpdate(
        {_id : id},
        {$set : {...req.body}},
        {new: true}
    );
    
    await newCategory.save();
    
    res.status(200).json({
        status: SUCCESS,
        requestedAt: req.requestedAt,
        msg: 'Category Updated Successfully!',
        data: {
            newCategory
        }
    });


});

exports.deleteCategory = asyncWrapper( async(req, res, next) => {
    const { id } = req.params;
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        const error = AppError.createError('Invalid Object ID', 400, FAIL);
        return next(error);
    }

    const category = await Category.findOne({_id : id});
    if(!category) {
        const error = AppError.createError('No such category', 404, FAIL);
        return next(error);
    }

    await Category.findOneAndDelete({_id : id});
    res.status(204).json({
        status: SUCCESS,
        requestedAt: req.requestedAt,
        msg: 'Category deleted successfully!'
    });

});

// Custom 
exports.getCategoryByID = asyncWrapper(async(id) => {
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        return null;
    }

    const category = await Category.findOne({_id : id});
    if(!category) {
        return null;
    }

    return category;
});