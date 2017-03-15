'use strict';

const express = require('express');
const status = require('http-status');

module.exports = function (Auth) {
    const router = express.Router();

    // creates a token
    router.post('/login', function (req, res) {
        Auth.create((err, header, body) => {
            if (body) {
                res.status(status.CREATED).send(body);
            } else {
                res.status(header.statusCode).send({});
            }
        });
    });

    // validates a token
    router.post('/validate', function (req, res) {
        Auth.validate((err, header, body) => {
            if (body) {
                res.status(status.OK).send(body);
            } else {
                res.status(header.statusCode).send({});
            }
        });
    });

    return router;
};
