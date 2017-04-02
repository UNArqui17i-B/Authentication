'use strict';

const request = require('request');
const status = require('http-status');
const jwt = require('jsonwebtoken');

// CouchDB url
const DB_PORT = process.env.DB_PORT || 5984;
const DB_URL = process.env.DB_URL || 'localhost';
const DB_NAME = process.env.DB_NAME || 'blinkbox_users';
const url = `http://${DB_URL}:${DB_PORT}/`;
const dbUrl = url + DB_NAME;

const secret = process.env.JWT_SECRET || 'blinkbox is cool';

let Auth = {};

Auth.checkDB = (func) => {
    request.head(dbUrl, (err, res, body) => {
        if (err || (res.statusCode === status.INTERNAL_SERVER_ERROR)) {
            func(err, res, body);
        } else {
            request.put(dbUrl, func);
        }
    });
};

Auth.create = (id, func) => {
    request.get(`${dbUrl}/${id}`, (err, res, body) => {
        if (err || (res.statusCode === status.INTERNAL_SERVER_ERROR)) {
            func(err, res);
        } else {
            body = JSON.parse(body);

            if (body.error) {
                // if the user doesn't exist
                func(true, {statusCode: status.NOT_FOUND}, {});
            } else if (body.token) {
                // token already existing
                func(null, {statusCode: status.FOUND}, {token: body.token, expDate: body.expDate});
            } else {
                // creates token
                let expiry = new Date();
                expiry.setDate(expiry.getDate() + 7);

                const expDate = parseInt(expiry.getTime() / 1000);
                const token = jwt.sign({
                    id: body.id,
                    email: body.email,
                    name: body.name,
                    exp: expDate
                }, secret);
                body.token = token;
                body.expDate = expDate;

                request({
                    method: 'PUT',
                    url: `${dbUrl}/${id}`,
                    json: body
                }, (err, header, body) => {
                    if (err) {
                        func(err, header, body);
                    } else {
                        func(null, {statusCode: status.CREATED}, {token: token, expDate: expDate});
                    }
                });
            }
        }
    });
};

Auth.validate = (token, func) => {
    jwt.verify(token.token, secret, (err, decoded) => {
        if (err) {
            func(err, {statusCode: status.BAD_REQUEST});
        } else {
            console.log(decoded);
            func(null, {statusCode: status.OK}, decoded);
        }
    });
};

module.exports = Auth;
