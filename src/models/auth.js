'use strict';

const request = require('request');
const status = require('http-status');
const jwt = require('jsonwebtoken');

// CouchDB url
const PORT = process.env.PORT || 5984;
const ROOT_URL = process.env.ROOT_URL || 'localhost';
const url = `http://${ROOT_URL}:${PORT}/`;
const dbUrl = url + 'blinkbox_auth';

const secret = process.env.SECRET || 'blinkbox is cool';

let Auth = {};

Auth.checkDB = (func) => {
    // eslint-disable-next-line no-unused-vars
    request.head(dbUrl, (err, res, body) => {
        if (err || (res.statusCode === status.INTERNAL_SERVER_ERROR)) {
            func(err, res);
        } else {
            request.put(dbUrl, func);
        }
    });
};

Auth.create = (user, func) => {
    request.get(`${dbUrl}/${user.id}`, (err, res, body) => {
        if (err || (res.statusCode === status.INTERNAL_SERVER_ERROR)) {
            func(err, res);
        } else {
            console.log(body);
            if (body) {
                func(null, {statusCode: status.FOUND}, body);
            } else {
                let expiry = new Date();
                expiry.setDate(expiry.getDate() + 7);

                const token = jwt.sign({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    exp: parseInt(expiry.getTime() / 1000),
                }, secret);

                request({
                    method: 'PUT',
                    url: `${dbUrl}/${user.id}`,
                    json: token
                }, func);
            }
        }
    });
};

Auth.validate = (token, rev, func) => {
    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            func(err, {statusCode: status.BAD_REQUEST})
        } else {
            request.get(`${dbUrl}/${decoded.id}`, func);
        }
    });
};

module.exports = Auth;
