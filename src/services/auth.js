'use strict';

const express = require('express');
const status = require('http-status');

module.exports = function (Auth) {
    const router = express.Router();

    // check valid user and password and creates a token
    router.post('/login', function (req, res) {
        Auth.create(req.body)
            .then((ans) => res.status(ans.status).send(ans.body))
            .catch((err) => res.status(status.BAD_REQUEST).send(err));
    });

    // validates a token
    router.post('/validate', function (req, res) {
        Auth.validate(req.body)
            .then((body) => res.status(status.OK).send(body))
            .catch((err) => res.status(status.BAD_REQUEST).send(err));
    });

    // email verification

    router.put('/email/:id', function (req, res) {
        Auth.emailVerification(req.params.id)
            .then((body) => res.status(status.OK).send(body))
            .catch((err) => res.status(status.BAD_REQUEST).send(err));
    });

    return router;
};
