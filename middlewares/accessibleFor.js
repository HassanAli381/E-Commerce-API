const AppError = require("../utils/AppError");
const { FAIL } = require("../utils/responseText");

module.exports = (cur = undefined) => {
    return (req, res, next) => {
        const curUser = req.user;
        const userRole = curUser.role;
        if(userRole === 'ADMIN')
            return next();
        
        if(cur && cur === 'loggedInUser' && curUser._id == req.params.id){
            return next();
        }
        else if (cur && cur === 'reviewOwner') {
            const reviewID = req.params.id;
            const hasReview = curUser.reviews.some(review => review._id == reviewID);
            if (hasReview) 
                return next();
        }
        else if (cur && cur === 'productOwner') {
            const productID = req.params.id;
            const hasProduct = curUser.productsOwned.some(product => product._id == productID);
            if(hasProduct) 
                return next();
        }
        
        const error = AppError.createError('You cannot access this route', 403, FAIL);
        return next(error);            
    };
};