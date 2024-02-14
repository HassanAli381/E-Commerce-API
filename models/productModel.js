const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
    name: {
        type: String, 
        required: [true, 'Product name is required'],
        maxlength: [20, 'Product name is too long it musn\'t exceed 20 characters'],
        trim: true,
    },
    price: {
        type: Number,
        required: [true, 'Product price is required'],
    },
    slug: String,
    photo: {
        type: String,
        default: 'productDefault.jpg'
    },
    description: {
        type: String,
        maxlength: [300, 'description length cannot exceed 300 characters']
    },
    category: {
        type: mongoose.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Product Category is requried!']
    },
    buyers: [{
        type: mongoose.Types.ObjectId,
        ref: 'User'
    }],
    reviews: [{
        type: mongoose.Types.ObjectId,
        ref: 'Review'
    }],
    avgRating: {
        type: Number,
        default: 0
    },
    usersWishlisted: [{
        type: mongoose.Types.ObjectId,
        ref: 'User'
    }],
    ownedBy: {
        type: mongoose.Types.ObjectId,
        ref: 'User'    
    }
},
{
    timestamps: true
}
);


productSchema.pre('save', function(next) {
    this.slug = slugify(this.name, { lower: true });
    next();
});

const product = mongoose.model('Product', productSchema);
module.exports = product;