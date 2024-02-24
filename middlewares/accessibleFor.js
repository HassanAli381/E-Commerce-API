const AppError = require("../utils/AppError");
const { FAIL } = require("../utils/responseText");

module.exports = () => {
    return (req, res, next) => {
        const curUser = req.user;
        const userRole = curUser.role;
        if(userRole === 'ADMIN')
            return next();
        
        const error = AppError.createError('You cannot access this route', 403, FAIL);
        return next(error);            
    };
};