const User = require('../models/userModel');

const reviewsController = require('./reviewsController');
const productController = require('./productController');

const asyncWrapper = require('express-async-handler');
const AppError = require('../utils/AppError');
const validateObjectID = require('./../utils/validateObjectID');
const { SUCCESS, FAIL } = require('../utils/responseText');

const {filterObject} = require('./../utils/filterObject');

const multer = require('multer');

const multerStorage = multer.diskStorage({
    destination: (req, res, cb) => {
        cb(null, `${__dirname}/../public/img`);
    },
    filename: (req, file, cb) => {
        const ext = file.mimetype.split('/')[1];
        cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
    }
});

const multerFilter = (req, file, cb) => {
    if(file.mimetype.startsWith('image')) {
        cb(null, true);
    }
    else {
        cb(AppError.createError('This field accepts only images', 400, FAIL), false);
    }
}

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

exports.uploadPhoto = upload.single('photo');

exports.getAllUsers = asyncWrapper(async (req, res, next) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const skip = (page - 1) * limit;
    
    const users = await User.find({}, {'__v' : false, 'password' : false}).limit(limit).skip(skip);
    res.status(200).json({
        status: SUCCESS,
        requestedAt: req.requestedAt,
        results: users.length,
        data: {
            users
        }
    });
});

exports.getUser = asyncWrapper(async(req, res, next) => {
    const id = req.params.id;
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        const error = AppError.createError('Invalid Object ID', 400, FAIL);
        return next(error);
    }
    
    let user = await User.findOne({_id : id});
    if(!user) {
        const error = AppError.createError('No Such User', 404, FAIL);
        return next(error);
    }

    user = await User.findOne({ _id: id }).populate({
        path: 'wishList productsOwned',
        select: '_id name price main_photo',
        populate: {
            path: 'category',
            select: 'name'
        },
    })
    .populate({
        path: 'reviews',
        select: '-__v'
    })
    .select('-password -__v');

    res.status(200).json({
        status: SUCCESS, 
        requestedAt : req.requestedAt,
        data: {
            user
        }
    });
});

// Accessible for admin
exports.updateUser = asyncWrapper(async (req, res, next) => {
    updateMe(req, res, next);
});

exports.updateMe = asyncWrapper(async(req, res, next) => {
    const id = req.params.id;
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        const error = AppError.createError('Invalid Object ID', 400, FAIL);
        return next(error);
    }
    
    const user = await User.findOne({_id : id});
    if(!user) {
        const error = AppError.createError('No Such User', 404, FAIL);
        return next(error);
    }
    
    if(req.body.password) {
        const error = AppError.createError('You cannot change password via this route, Use Change Password route!', 400, FAIL);
        return next(error);
    }

    try{  
        const filteredObject = filterObject(req.body, 'name', 'email', 'photo', 'age');
        console.log(filteredObject);

        const newUpdatedUser = await User.findByIdAndUpdate(
            {_id : id},
            { $set: {...filteredObject}},
            {
                new: true,
                runValidators: true
            }
        );
    
        if(req.file){
            newUpdatedUser.photo = req.file.filename;
            await newUpdatedUser.save();
        }

        res.status(200).json({
            status: SUCCESS,
            msg: 'Data Updated Successfully!',
            data: {
                newUpdatedUser
            }
        });
    }
    catch(err) {
        return next(new Error());
    }
});


exports.deleteUser = asyncWrapper(async (req, res, next) => {
    this.deleteMyAccount(req, res, next);
});

exports.deleteMyAccount = asyncWrapper(async(req, res, next) => {
    const id = req.params.id;
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        const error = AppError.createError('Invalid Object ID', 400, FAIL);
        return next(error);
    }
    
    const user = await User.findOne({_id : id});
    if(!user) {
        const error = AppError.createError('No Such User', 404, FAIL);
        return next(error);
    }

    // console.log(req.user);

    if(req.user._id.toString() !== req.params.id)  {
        const error = AppError.createError('You are not allowed to access this route', 403, FAIL);
        return next(error);
    }

    req.noResponse = true;

    // 1) delete all reviews of the user
    for(let review of req.user.reviews) {
        req.params.id = review;
        await reviewsController.deleteMyReview(req, res, next);
    }
    
    // 2) delete all products the user own
    for(let product of req.user.productsOwned) {
        req.params.id = product;
        // console.log(product);
        // console.log(req.params);
        await productController.deleteMyProduct(req, res, next);
    }

    // console.log(id);
    // 3) delete the user  
    await User.findOneAndDelete({_id: id});

    res.status(204).json({
        status: SUCCESS,
        msg: 'Account deleted successfully!'
    });
});

//Custom
exports.getUserByID = asyncWrapper(async(id) => {
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        return null;
    }
    
    const user = await User.findOne({_id : id});
    if(!user) {
        return null;
    }

    return user;
});

exports.getWishList = asyncWrapper(async(req, res, next) => {
    const { id } = req.params;
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        const error = AppError.createError('Invalid Object ID', 400, FAIL);
        return next(error);
    }

    const user = await User.findOne({_id : id});
    if(!user) {
        const error = AppError.createError('No such user', 404, FAIL);
        return next(error);
    }
    
    const wishListed = await User.findOne({_id : id}).populate({
        path: 'wishList',
        select: 'name price main_photo category',
        populate: {
            path: 'category reviews',
            select: 'name rating',
        }
    });

    const wishlist = wishListed.wishList;
    res.status(200).json({
        status: SUCCESS,
        requestedAt: req.requestedAt,
        results: wishlist.length,
        data: {
            wishlist
        }
    });
});

exports.getReviews = asyncWrapper(async(req, res, next) => {
    const { id } = req.params;
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        const error = AppError.createError('Invalid Object ID', 400, FAIL);
        return next(error);
    }

    const user = await User.findOne({_id : id});
    if(!user) {
        const error = AppError.createError('No such user', 404, FAIL);
        return next(error);
    }

    const result =  await User.findOne({_id : id}).populate({
        path: 'reviews',
        select: '-__v -owner'
    });
    
    const reviews = result.reviews;
    res.status(200).json({
        status: SUCCESS,
        requestedAt: req.requestedAt,
        data: {
            reviews
        }
    });

});