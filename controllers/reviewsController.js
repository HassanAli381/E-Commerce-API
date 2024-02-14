const Review = require('./../models/reviewModel');
const { SUCCESS, FAIL } = require('../utils/responseText');
const validateObjectID = require('./../utils/validateObjectID');
const AppError = require('./../utils/AppError');
const asyncWrapper = require('express-async-handler');
const productController = require('./productController');
const User = require('../models/userModel');

// @description Get Reviews of a certain product (Product_id)
const getReviews = (async(req, res, next) => {
    const { id } = req.params;
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        const error = AppError.createError('Invalid Object ID', 400, FAIL);
        return next(error);
    }

    const product = await productController.getProductByID(id);
    if(!product) {
        const error = AppError.createError('No such Product', 404, FAIL);
        return next(error);
    }

    await product.populate('reviews');
    
    const reviews = product.reviews;

    res.status(200).json({
        status: SUCCESS,
        requestedAt: req.requestedAt,
        results: reviews.length,
        data: {
            reviews
        }
    });
});

const addReview = asyncWrapper(async(req, res, next) => {
    const { id } = req.params;
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        const error = AppError.createError('Invalid Object ID', 400, FAIL);
        return next(error);
    }

    const product = await productController.getProductByID(id);
    if(!product) {
        const error = AppError.createError('No such Product', 404, FAIL);
        return next(error);
    }

    const review = new Review(req.body);
    
    // add review to user
    const owner = req.user;
    review.owner = owner;
    if(!owner.reviews)
        owner.reviews = [];
    owner.reviews.push(review);
    await owner.save();

    // add review to the product 
    if(!product.reviews)
        product.reviews = [];
    product.reviews.push(review);
    await product.save();
    await review.save();

    res.status(201).json({
        status: SUCCESS,
        requestedAt: req.requestedAt,
        msg: 'review added successfully!',
        data: {
            review
        }
    });

});

const updateReview = asyncWrapper(async(req, res, next) => {
    const { id } = req.params;
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        const error = AppError.createError('Invalid Object ID', 400, FAIL);
        return next(error);
    }

    const review = await Review.findById(id);
    if(!review) {
        const error = AppError.createError('No such Review', 404, FAIL);
        return next(error);
    }

    const newReview = await Review.findByIdAndUpdate(
        {_id: id},
        {$set: {...req.body} },
        {new: true}
    );
    
    res.status(200).json({
        status: SUCCESS, 
        requestedAt: req.requestedAt,
        msg: 'Review Updated Successfully!',
        data: {
            newReview
        }
    });
});

const deleteReview =  asyncWrapper(async(req, res, next) => {
    const { id } = req.params;
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        const error = AppError.createError('Invalid Object ID', 400, FAIL);
        return next(error);
    }

    const review = await Review.findById(id);
    if(!review) {
        const error = AppError.createError('No such Review', 404, FAIL);
        return next(error);
    }

    const ownedBy = review.owner;
    await User.findOneAndUpdate(
        { _id : ownedBy },
        { $pull: { reviews: id } }
    );

    await Review.findByIdAndDelete({_id: id});

    res.status(204).json({
        status: SUCCESS,
        requestedAt: req.requestedAt,
        msg: 'Product Deleted Successfully!',
        data: null
    });

});

const getReviewByID = asyncWrapper(async(id) => {
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        return null;
    }
    
    const review = await Review.findOne({_id : id});
    if(!review) {
        return null;
    }

    return review;
});

module.exports = {
    getReviews,
    addReview,
    updateReview,
    deleteReview,
    getReviewByID
}