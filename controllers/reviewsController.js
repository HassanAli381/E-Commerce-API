const Review = require('./../models/reviewModel');
const User = require('../models/userModel');
const Product = require('../models/productModel');

const productController = require('./productController');

const { SUCCESS, FAIL } = require('../utils/responseText');
const AppError = require('./../utils/AppError');
const validateObjectID = require('./../utils/validateObjectID');
const asyncWrapper = require('express-async-handler');
const { filterObject } = require('../utils/filterObject');

// @description Get Reviews of a certain product (Product_id)
const getReviews = asyncWrapper(async(req, res, next) => {
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
    
    if(!owner.reviews)
        owner.reviews = [];

    owner.reviews.push(review);
    await owner.save();
    
    // add review to the product 
    if(!product.reviews)
        product.reviews = [];
    product.reviews.push(review);
    await product.save();
    
    review.owner = owner;
    review.product = product._id;

    await review.populate({
        path: 'owner',
        select: '_id name email photo role token',
    });

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

// @Accessibility: only for admins 
const updateReview = (req, res, next) => {
    updateMyReview(req, res, next);
}

// @Accessibility: for product owner or admins
const updateMyReview = asyncWrapper(async(req, res, next) => {
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

    if(req.user.role !== 'ADMIN') {
        const hasReview = req.user.reviews.some(review => review._id == id);
        if(!hasReview) {
            const error = AppError.createError('You are not allowed to access this route', 403, FAIL);
            return next(error);
        } 
    }

    const allowedFields = filterObject(req.body, 'rating', 'comment');

    const newReview = await Review.findByIdAndUpdate(
        {_id: id},
        {$set: {...allowedFields} },
        {new: true}
    );
    
    await newReview.save();

    res.status(200).json({
        status: SUCCESS, 
        requestedAt: req.requestedAt,
        msg: 'Review Updated Successfully!',
        data: {
            newReview
        }
    });
});


const deleteReview = (req, res, next) => {
    deleteMyReview(req, res, next);
}

const deleteMyReview = asyncWrapper(async(req, res, next) => {
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

    if(req.user.role !== 'ADMIN') {
        const hasReview = req.user.reviews.some(review => review._id == id);
        if(!hasReview) {
            const error = AppError.createError('You are not allowed to access this route', 403, FAIL);
            return next(error);
        } 
    }

    // delete review from his owner reviews
    const ownedBy = review.owner;
    await User.findOneAndUpdate(
        { _id : ownedBy },
        { $pull: { reviews: id } }
    );

    // delete review from it's product reviews
    const productOfReview = review.product;
    await Product.findOneAndUpdate(
        { _id: productOfReview },
        { $pull: { reviews: id } }
    );

    await review.save();
    await Review.findByIdAndDelete({_id: id});
    
    if(!req.noResponse) {
        res.status(204).json({
            status: SUCCESS,
            requestedAt: req.requestedAt,
            msg: 'Review Deleted Successfully!',
            data: null
        });
    }

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
    updateMyReview,
    deleteReview,
    deleteMyReview,
    getReviewByID
}