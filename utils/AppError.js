class AppError extends Error {
    constructor() {
        super();
        this.isOperational = true;
    }

    createError(message, statusCode, status) {
        this.message = message;
        this.statusCode = statusCode;
        this.status = status;
        return this;
    }
}

module.exports = new AppError();