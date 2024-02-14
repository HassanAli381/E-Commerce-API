const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const dotenv = require('dotenv');
dotenv.config({});

const AppError = require('./utils/AppError');
const { ERROR } = require('./utils/responseText');

const userRoutes = require('./routes/userRoutes');
const categoriesRoutes = require('./routes/categoriesRoutes');
const productsRoute = require('./routes/productRoutes');
const reviewsRoute = require('./routes/reviewsRoutes');

const app = express();

mongoose.connect(process.env.DB_URL)
.then(() => { console.log('Connected to DB Successfully!') })
.catch((err) => { console.log('Error Happend while trying to Connect to DB ', err)});


app.use(express.json());

app.use(morgan('dev'));

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
    const error = AppError.createError(`Route ${req.originalUrl} is not found in the server`, 404, 'fail');
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