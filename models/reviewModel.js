const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [0, 'Minimum Rating is 0'],
        max: [5, 'Maximum Rating is 5'],
        default: 0
    },
    comment: String
});


const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;