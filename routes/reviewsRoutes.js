const router = require('express').Router();
const reviewsController = require('./../controllers/reviewsController');
const { verifyToken } = require('../middlewares/verifyToken');
const accessibleFor = require('../middlewares/accessibleFor');

router.route('/:id')
    .get(reviewsController.getReviews)
    .post(verifyToken, reviewsController.addReview)
    .patch(verifyToken, accessibleFor('reviewOwner'), reviewsController.updateReview)
    .delete(verifyToken, accessibleFor('reviewOwner'), reviewsController.deleteReview);

module.exports = router;