const User = require('./../models/userModel');

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { generateJWT } = require('./../utils/generateJWT');

const AppError = require('../utils/AppError');
const asyncWrapper = require('express-async-handler');
const validateObjectID = require('./../utils/validateObjectID');

const { SUCCESS, FAIL, ERROR } = require('./../utils/responseText');

const sendEmail = require('./../utils/email');


exports.register = asyncWrapper (async (req, res, next) => {
    const {name, email, password} = req.body;
    
    const user = await User.findOne({email : email});
    if(user) {
        const error = AppError.createError('User already exists', 400, FAIL);
        return next(error);
    }

    const hashedPassword = await bcrypt.hash(password, 8);
    req.body.password = hashedPassword;

    const newUser = new User({ 
        name,
        email,
        password: req.body.password 
    });
    await newUser.save();
    
    newUser.password = undefined;

    res.status(201).json({
        status: SUCCESS,
        requestedAt: req.requestedAt,
        data: {
            newUser
        }
    })
});

exports.login = asyncWrapper(async (req, res, next) => {
    const {email, password} = req.body;

    if(!email || !password) {
        const error = AppError.createError('email and password are required!', 400, FAIL);
        return next(error);
    }

    // check if a user has this email
    const user = await User.findOne({email});
    if(!user || !(await user.comparePasswords(password, user.password))) {
        const error = AppError.createError('Incorrect email or password!', 401, FAIL);
        return next(error);
    }

    // give user token
    const token = await generateJWT({email, id: user._id, role: user.role});
    user.token = token;
    await user.save();

    const cookieOptions = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        httpOnly: true
    };
    
    if(process.env.NODE_ENV === 'production')
        cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);

    res.status(200).json({
        status: SUCCESS,
        requestedAt: req.requestedAt,
        msg: 'Logged In Successfully',
        data: {
            token
        }
    });
});

exports.logout = asyncWrapper(async (req, res, next) => {
    const user = req.user;
    if(!user || !user.token) {
        const error = AppError.createError('You cannot logout', 403, FAIL);
        return next(error);
    }

    // clear the token from the cookie
    const cookieOptions = {
        expires: new Date(Date.now() - 1000),
        httpOnly: true
    }
    if(process.env.NODE_ENV === 'production')
        cookieOptions.secure = true;

    res.clearCookie('jwt', undefined, cookieOptions);
    user.token = undefined;

    req.user = undefined;
    await user.save();

    res.status(200).json({
        status: SUCCESS,
        msg: 'Logged out successfully!'
    });
});

exports.changePassword = asyncWrapper(async (req, res, next) => {
    const id = req.params.id;
    const isValidObjectID = validateObjectID(id);
    if(!isValidObjectID) {
        const error = AppError.createError('Invalid Object ID', 400, FAIL);
        return next(error);
    }
    
    const user = await User.findOne({_id : id}).select('+password');
    if(!user) {
        const error = AppError.createError('No Such User', 404, FAIL);
        return next(error);
    }

    const {oldPassword, newPassword} = req.body;

    // check if it matches the old password
    if(!(await user.comparePasswords(oldPassword, user.password))) {
        const error = AppError.createError('Old Password is not correct', 401, FAIL);
        return next(error);
    }

    user.password = await bcrypt.hash(newPassword, 8);
    await user.save();

    res.status(200).json({
        status: SUCCESS,
        requestedAt : req.requestedAt, 
        msg: 'Password Updated Successfully',
        data: {
            user
        }
    });

});

exports.forgotPassword = asyncWrapper(async (req, res, next) => {
    // 1) get user based on the POSTed email
    const user = await User.findOne({ email: req.body.email });
    if(!user) {
        const error = AppError.createError('No such user', 404, FAIL);
        return next(error);
    }

    // 2) Genereate random reset token
    const resetToken = await user.createPasswordResetToken();
    await user.save();

    // 3) Send it to user's email
    const resetUrl = `${req.protocol}://${req.get('host')}/api/users/reset-password/${resetToken}`;
    const message = `Forgot your password? Enter your new password in patch request to: ${resetUrl}\n if not please ignore this email`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Your password reset token (valid for 15 minutes)',
            message
        });

        res.status(200).json({
            status: SUCCESS,
            msg: 'Token sent to email'
        });
    }
    catch(err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        const error = AppError.createError('There was an error sending the email. Try again later!', 500, ERROR );
        return next(error);
    }

});

exports.resetPassword = asyncWrapper(async (req, res, next) => {
    // Get user based on the token
    // encrypt the token
    const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

    const user = await User.findOne({ 
        passwordResetToken: hashedToken,
        passwordResetExpires: {$gt: Date.now() }
    });

    // if token has not expired, and there is a user, set the new password 
    if(!user) {
        const error = AppError.createError('Token is invalid or has expired!', 400, FAIL);
        return next(error);
    }
    const encryptedPassword = await bcrypt.hash(req.body.password, 8);
    user.password = encryptedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    // log the user in, send JWT
    
    // give user token
    const token = await generateJWT({email: user.email, id: user._id, role: user.role});
    user.token = token;
    await user.save();

    res.status(200).json({
        status: SUCCESS,
        requestedAt: req.requestedAt,
        msg: 'password changed, and logged In Successfully',
        data: {
            token
        }
    });


});