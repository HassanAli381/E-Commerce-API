const mongoose = require('mongoose');
const validator = require('validator');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const slugify = require('slugify');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'User name is required'],
        trim: true,
        maxlength: [20, 'User Name musn\'t exceed 20 characters']
    },
    age: {
        type: Number,
        default: 20,
        min: [13, 'User must be above 13']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: [true, 'E-mail must be unique'],
        validate: [validator.isEmail, 'Invalid Email']
    },
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    token: String,
    photo: {
        type: String,
        default: 'userDefault.jpg'
    },
    role: {
        type: String,
        enum: ['USER', 'ADMIN'],
        default: 'USER'
    },
    productsOwned: [{
        type: mongoose.Types.ObjectId,
        ref: 'Product'
    }],
    productsBought: [{
        type: mongoose.Types.ObjectId,
        ref: 'Product'
    }], 
    wishList: [{
        type: mongoose.Types.ObjectId,
        ref: 'Product'
    }],
    reviews: [{
        type: mongoose.Types.ObjectId,
        ref: 'Review'
    }],
    passwordChangedAt: {
        type: Date,
        default: undefined
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    slug: String

}, 
{
    timestamps: true
});

userSchema.pre('save', function(next) {
    if(!this.isModified('password') || this.isNew)
        return next();

    this.passwordChangedAt = Date.now() - 1;
    next();
});

userSchema.pre('save', function(next) {
    this.slug = slugify(this.name, { lower: true });
    next();
});

// instance methods
userSchema.methods.comparePasswords = async(inputPassword, actualPassword) => {
    return await bcrypt.compare(inputPassword, actualPassword);
}


userSchema.methods.createPasswordResetToken = async function() {
    // generate the reset token, and we will send this token to the user to reset the password 
    const resetToken = crypto.randomBytes(32).toString('hex');
    // save the reset token (encrypted) in the DB
    this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

    // make the token expires after 15 minutes
    this.passwordResetExpires = Date.now() + (15 * 60 * 1000);

    // send it unencrypted
    return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;