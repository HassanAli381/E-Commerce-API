const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const dotenv = require('dotenv');
dotenv.config({});
const helmet = require('helmet');
const path = require('path');
const ratelimit = require('express-rate-limit');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const AppError = require('./utils/AppError');
const { ERROR, FAIL } = require('./utils/responseText');

const userRoutes = require('./routes/userRoutes');
const categoriesRoutes = require('./routes/categoriesRoutes');
const productsRoute = require('./routes/productRoutes');
const reviewsRoute = require('./routes/reviewsRoutes');

const app = express();

const limiter = ratelimit({
    max: 100,
    windowMs: 10 * 60 * 1000,

    statusCode: 429,
    message: {
        status: FAIL,
        message: 'Too many requests! please try again in an hour!'
    }
});
app.use('/api', limiter);

mongoose.connect(process.env.DB_URL)
.then(() => { console.log('Connected to DB Successfully!') })
.catch((err) => { console.log('Error Happend while trying to Connect to DB ', err)});

// logger
if(process.env.NODE_ENV === 'development')
    app.use(morgan('dev'));

// Set security HTTP headers
app.use(helmet());

// body parser, and limiting the size of the data that comes to the app  
app.use(express.json({ limit: '10kb' }));

// Data sanitization => means cleans all the data that comes to the app from malicious code
// Data sanitization against NOSQL query injection & XSS
app.use(mongoSanitize());
app.use(xss());

// prevent paramter pollution
app.use(hpp({
    whitelist: ['price', 'category', 'avgRating', 'ratingsQuantity', 'ownedBy']
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

app.use((req, res, next) => {
    req.requestedAt = new Date().toISOString();
    next();
});

// User Route
app.use('/api/users', userRoutes);

// Category Route
app.use('/api/categories', categoriesRoutes);

// Products Route
app.use('/api/products', productsRoute);

// Reviews Route
app.use('/api/reviews', reviewsRoute);

app.all('*', (req, res, next) => {
    const error = AppError.createError(`Route ${req.originalUrl} is not found in the server`, 404, FAIL);
    return next(error); 
});

app.use((err, req, res, next) => {
    const msg = err.message || 'Something went wrong';
    const statusCode = err.statusCode || 500;
    const status = err.status || ERROR;
    return res.status(statusCode).json({
        status,
        msg
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Listining on port ${port}`);
});