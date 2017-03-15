'use strict';

const express = require('express');
const status = require('http-status');

module.exports = function (Auth) {
    const router = express.Router();

    // creates a token
    router.post('/login', function (req, res) {
        Auth.create(req.body, (err, header, body) => {
            if (body && header.statusCode !== status.FOUND) {
                res.status(status.CREATED).send(body);
            } else {
                res.status(header.statusCode).send({});
            }
        });
    });

    // validates a token
    router.post('/validate', function (req, res) {
        Auth.validate(req.body, (err, header, body) => {
            if (body) {
                res.status(status.OK).send(body);
            } else {
                res.status(header.statusCode).send(body || {});
            }
        });
    });

    return router;
};
