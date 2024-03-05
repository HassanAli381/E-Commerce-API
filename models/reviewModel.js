const mongoose = require('mongoose');

const Product = require('./productModel');

const reviewSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: [true, 'review should belong to a user']
    },
    product: {
        type: mongoose.Types.ObjectId,
        ref: 'Product',
        required: [true, 'review should belong to a product']
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [0, 'Minimum Rating is 0'],
        max: [5, 'Maximum Rating is 5'],
        default: 0
    },
    comment: String
},
{
    timestamps: true
}
);

// calculate avg rating of a specific product 
reviewSchema.statics.calcAvgRating = async function(prodID) {
    const status = await this.aggregate([
        {
            $match: {product: prodID}
        },
        {
            // grouping comments that shares the same product
            $group: {
                _id: '$product',
                ratingsNumbers: { $sum: 1 },
                avgRating: { $avg: '$rating' }
            }
        }
    ]);
    console.log(status);

    await Product.findByIdAndUpdate(prodID, {
        ratingsQuantity: status[0].ratingsNumbers,
        avgRating: status[0].avgRating
    });

}

reviewSchema.post('save', function() {
    // console.log('this.constructor', this.constructor);
    this.constructor.calcAvgRating(this.product);
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;