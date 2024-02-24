const router = require('express').Router();
const reviewsController = require('./../controllers/reviewsController');
const { verifyToken } = require('../middlewares/verifyToken');
const accessibleFor = require('../middlewares/accessibleFor');

router.route('/:id')
    .get(reviewsController.getReviews)
    .post(verifyToken, reviewsController.addReview)
    .patch(verifyToken, accessibleFor(), reviewsController.updateReview)
    .delete(verifyToken, accessibleFor(), reviewsController.deleteReview);

router.route('/update-my-review/:id').patch(verifyToken, reviewsController.updateMyReview);
router.route('/delete-my-review/:id').delete(verifyToken, reviewsController.deleteMyReview);


module.exports = router;