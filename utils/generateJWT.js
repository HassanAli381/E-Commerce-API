const jwt = require('jsonwebtoken');

exports.generateJWT = async (payload) => {
    return await jwt.sign(
        payload,
        process.env.JWT_SECURITY_KEY, {
            expiresIn: '7d'
        }
    );
}