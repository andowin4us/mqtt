const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const configureServer = (app) => {
    // Security middleware
    app.use(cors());
    app.use(helmet({ 
        dnsPrefetchControl: false, 
        frameguard: false, 
        ieNoOpen: false 
    }));

    // Rate limiting
    const limiter = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 1000, // limit each IP to 1000 requests/minute
        message: 'Too many requests from this IP, please try again later.'
    });
    app.use(limiter);

    // Performance middleware
    app.use(compression());
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Static files
    app.use('/static', express.static(path.join(__dirname, '../private')));

    return app;
};

module.exports = { configureServer }; 