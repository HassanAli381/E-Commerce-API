const Product = require('./../models/productModel');
const User = require('../models/userModel');
const Review = require('../models/reviewModel');
const Category = require('./../models/categoryModel');

const categoriesController = require('./categoriesController');

const { SUCCESS, FAIL} = require('../utils/responseText');
const AppError = require('./../utils/AppError');
const asyncWrapper = require('express-async-handler');
const validateObjectID = require('./../utils/validateObjectID');
const { filterObject } = require('../utils/filterObject');

const getAllProducts = asyncWrapper (async (req, res) => {
    const products = await Product.find().populate({
        path: 'category buyers',
        select: '-__v -products -password',
    })
    .select('-__v');

    res.status(200).json({
        status: SUCCESS,
        requestedAt: req.requestedAt,
        results: products.length,
        data: {
            products
        }
    });
});

const getProduct = asyncWrapper(async(req, res, next) => {
    const { id } = req.params;
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        const error = AppError.createError('Invalid Object ID', 400, FAIL);
        return next(error);
    }

    const product = await Product.findOne({_id : id});
    if(!product) {
        const error = AppError.createError('No such Product', 404, FAIL);
        return next(error);
    }

    await product.populate({
        path: 'category reviews',
        select: 'owner rating comment name'
    });

    res.status(200).json({
        status: SUCCESS, 
        requestedAt: req.requestedAt,
        data: {
            product
        }
    });
    

});

const addProduct = asyncWrapper (async(req, res, next) => {
    const categoryID = req.body.category;
    const category = await categoriesController.getCategoryByID(categoryID);
    if(!category) {
        const error = AppError.createError('No such category', 404, FAIL);
        return next(error);
    }
    
    const product = new Product(req.body);
    if(req.file){
        product.photo = req.file.filename;
    }

    if (!category.products) {
        category.products = [];
    }
   
    category.products.push(product);
    await category.save();

    product.ownedBy = req.user._id;
    await product.save();
    
    const curUser = req.user;
    curUser.productsOwned.push(product);
    await curUser.save();

    await product.populate({
        path: 'category',
        select: 'name'
    });

    res.status(201).json({
        status: SUCCESS, 
        requestedAt: req.requestedAt,
        msg: 'Product added successfully!',
        data: {
            product
        }
    });
});

// @Accessibility: Only accessible for admins
const updateProduct = (req, res, next) => {
    updateMyProduct(req, res, next);
};

// @Accessibility: for product owner or admins
const updateMyProduct = asyncWrapper(async(req, res, next) => {
    const { id } = req.params;
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        const error = AppError.createError('Invalid Object ID', 400, FAIL);
        return next(error);
    }

    const product = await Product.findOne({_id : id});
    if(!product) {
        const error = AppError.createError('No such Product', 404, FAIL);
        return next(error);
    }

    if(req.user.role !== 'ADMIN') {
        const hasProduct = req.user.productsOwned.some(product => product._id == id);
        if(!hasProduct) {
            const error = AppError.createError('You are not allowed to access this route', 403, FAIL);
            return next(error);
        } 
    }

    
    // limiting fields that can be updated!
    const allowedFields = filterObject(req.body, 'name', 'price', 'photo', 'category');

    const updatedProduct = await Product.findByIdAndUpdate(
        { _id: id },
        { $set: {...allowedFields} },
        {
            new: true,
            runValidators: true
        }
    )
    .populate({
        path: 'category',
        select: 'name'
    })
    .select('-__v');

    if(req.file){
        updatedProduct.photo = req.file.filename;
    }
    await updatedProduct.save();

    res.status(200).json({
        status: SUCCESS, 
        requestedAt: req.requestedAt,
        msg: 'Product Updated Successfully!',
        data: {
            updatedProduct
        }
    });

});

// @Accessibility: Only accessible for admins
const deleteProduct = (req, res, next) => {
    deleteMyProduct(req, res, next);
}

// @Accessibility: for product owner or admins
const deleteMyProduct = asyncWrapper(async(req, res, next) => {
    const { id } = req.params;
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        const error = AppError.createError('Invalid Object ID', 400, FAIL);
        return next(error);
    }

    const product = await Product.findOne({_id : id});
    if(!product) {
        const error = AppError.createError('No such Product', 404, FAIL);
        return next(error);
    }

    if(req.user.role !== 'ADMIN') {
        const hasProduct = req.user.productsOwned.some(product => product._id == id);
        if(!hasProduct) {
            const error = AppError.createError('You are not allowed to access this route', 403, FAIL);
            return next(error);
        } 
    }

    // delete product from it's category
    await Category.updateOne(
        { _id: product.category},
        { $pull: { products: id } }
    );

    //delete product from wishlisted users 
    for(let i = 0; i < product.usersWishlisted.length; ++i) {
        const userID = product.usersWishlisted[i];
        await User.updateOne(
            { _id: userID },
            { $pull: { wishList: id } }
        );
    }

    // delete from it's owned user
    const owner = await User.findOne({_id : product.ownedBy});
    await User.updateOne(
        { _id: owner._id },
        { $pull: { productsOwned: id } }
    );


    // delete reviews of the product
    for(let i = 0; i < product.reviews.length; ++i) {
        const curReviewID =  product.reviews[i];
        const review = await Review.findOne({_id: curReviewID});
        if(!review) {
            continue;
        }

        const reviewOwnerID = review.owner;
        // delete review from the owner user
        await User.updateOne(
            { _id: reviewOwnerID },
            { $pull: { reviews: curReviewID } }
        );

        // TO-DO => Delete Actual review
        await Review.findOneAndDelete({ _id: curReviewID });
    }

    await Product.findByIdAndDelete(id);
    if(!req.noResponse) {
        res.status(204).json({
            status: SUCCESS,
            requestedAt: req.requestedAt,
            msg: 'Product deleted successfully!',
            data: {
                product
            }
        });
    }
});

// Custom 
const getProductByID = asyncWrapper(async(id) =>{
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        return null;
    }

    const product = await Product.findById(id);
    if(!product)
        return null;

    return product;
});

const addProductToWishList = asyncWrapper(async(req, res, next) => {
    const { id } = req.params;
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        const error = AppError.createError('Invalid Object ID', 400, FAIL);
        return next(error);
    }

    const product = await Product.findOne({_id : id});
    if(!product) {
        const error = AppError.createError('No such Product', 404, FAIL);
        return next(error);
    }

    const user = req.user;
    if(!user) {
        const error = AppError.createError('No such user!', 404, FAIL);
        return next(error);
    }

    if(!user.wishList)
    user.wishList = [];

    let isWishlisted = false;
    for(let i = 0; i < user.wishList.length; ++i) {
        if(user.wishList[i].toString() === product._id.toString()) {
            isWishlisted = true;
            break;
        }
    }

    if(isWishlisted) {
        const error = AppError.createError('Product is already wishlisted', 400, FAIL);
        return next(error);
    }

    user.wishList.push(id);
    await user.save();
    const wishList = user.wishList;
    product.usersWishlisted.push(user._id);
    await product.save();
    
    res.status(200).json({
        status: SUCCESS,
        requestedAt: req.requestedAt,
        msg: 'Product added to wishlist list successfully!',
        data: {
            wishList
        }
    });

});

const removeProdFromWishList = asyncWrapper(async(req, res, next) => {
    const { id } = req.params;
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        const error = AppError.createError('Invalid Object ID', 400, FAIL);
        return next(error);
    }

    const product = await Product.findOne({_id : id});
    if(!product) {
        const error = AppError.createError('No such Product', 404, FAIL);
        return next(error);
    }

    const user = req.user;
    if(!user) {
        const error = AppError.createError('No such user!', 404, FAIL);
        return next(error);
    }

    if(!user.wishList) {
        const error = AppError.createError('User has no wishList!', 400, FAIL);
        return next(error);    
    }

    // remove product's id from user's wishlist
    await User.updateOne(
        {_id: user._id},
        { $pull: { wishList: id } }
    );

    // remove user's id from id users wishlisted
    await Product.updateOne(
        {_id: id},
        { $pull: { usersWishlisted: user.id } }
    );


    await user.save();

    res.status(204).json({
        status: SUCCESS,
        requestedAt: req.requestedAt,
        msg: 'Product removed from favourite list successfully!',
        data: null
    });

});

const searchForProduct = asyncWrapper(async(req, res, next) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const skip = (page - 1) * limit;
    console.log(req.params);

    const matchedResults = await Product.find(
        {
            "$or": [
                {
                    name: {
                        $regex: req.params.searchKeyword,
                        $options: "i" // Case-insensitive
                    }
                }
            ]
        }
    )
    .limit(limit)
    .skip(skip);

    res.status(200).json({
        status: SUCCESS, 
        requestedAt: req.requestedAt,
        results: matchedResults.length,
        data: { 
            matchedResults
        }
    });
});

module.exports = {
    getAllProducts,
    getProduct,
    addProduct,
    updateProduct,
    updateMyProduct,
    deleteProduct,
    deleteMyProduct,
    getProductByID,
    addProductToWishList,
    removeProdFromWishList,
    searchForProduct
}