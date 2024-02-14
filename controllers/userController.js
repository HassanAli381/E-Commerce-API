const asyncWrapper = require('express-async-handler');
const User = require('../models/userModel');
const AppError = require('../utils/AppError');
const validateObjectID = require('./../utils/validateObjectID');
const { SUCCESS, FAIL } = require('../utils/responseText');

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
        path: 'wishList',
        select: '_id name price main_photo',
        populate: {
            path: 'category',
            select: 'name'
        }
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

    try {
        const newUpdatedUser = await User.findByIdAndUpdate(
            {_id : id},
            {$set: {...req.body}}, 
            {
                new: true,
                runValidators: true
            }
        );

        if(req.file) {
            newUpdatedUser.photo = req.file.filename;
            await newUpdatedUser.save();
        }
        
        res.status(200).json({
            status: SUCCESS,
            requestedAt : req.requestedAt, 
            msg: 'User Updated Successfully',
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

    await User.findOneAndDelete({_id : id});
    res.status(204).json({
        status: SUCCESS,
        requestedAt : req.requestedAt, 
        msg: 'User Deleted Successfully',
    });
});

const filterObject = (obj, ...allowedFields) => {
    const retObj = {};
    Object.keys(obj).forEach(el => {
        if(allowedFields.includes(el))
            retObj[el] = obj[el];
    });
    return retObj;
};

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

    await User.findByIdAndDelete(id);
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