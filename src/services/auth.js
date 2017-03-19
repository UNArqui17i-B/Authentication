'use strict';

const express = require('express');
const status = require('http-status');

module.exports = function (Auth) {
    const router = express.Router();

    // creates a token
    router.get('/login/:id', function (req, res) {
        Auth.create(req.params.id, (err, header, body) => {
            if (err) {
                res.status(header.statusCode || status.BAD_REQUEST).send(body);
            } else {
                res.status(header.statusCode).send(body);
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
