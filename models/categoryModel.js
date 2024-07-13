const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        unique: [true, 'Category name must be unique'],
        maxlength: [20, 'Category name is too long it musn\'t exceed 20 characters'],
        trim: true
    },
    products: [{
        type: mongoose.Types.ObjectId,
        ref: 'Product'
    }]
});

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
