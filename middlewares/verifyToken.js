const User = require("../models/userModel");
const AppError = require("../utils/AppError");
const { FAIL } = require("../utils/responseText");
const jwt = require('jsonwebtoken');
const asyncWrapper = require('express-async-handler');

exports.verifyToken = asyncWrapper(async(req, res, next) => {
    const authHeader = req.headers['Authorization'] || req.headers['authorization'];
    if(!authHeader || !(authHeader.startsWith('Bearer'))) {
        const error = AppError.createError('You must be authorized to be able to access the route', 401, FAIL);
        return next(error);
    }

    const token = authHeader.split(' ')[1];
    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECURITY_KEY);
        
        const user = await User.findById(decodedToken.id);
        if(!user) {
            const error = AppError.createError('Token Bearer has been deleted or not existed!', 403, FAIL)
            return next(error);
        }

        req.user = user;

    }
    catch(err) {
        const error = AppError.createError('Invalid Token', 403, FAIL);
        return next(error);
    }

    next();
})