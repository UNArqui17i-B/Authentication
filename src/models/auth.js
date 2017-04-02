'use strict';

const request = require('request-promise');
const status = require('http-status');
const jwt = require('jsonwebtoken');

// CouchDB url
const DB_PORT = process.env.DB_PORT || 5984;
const DB_URL = process.env.DB_URL || 'localhost';
const DB_NAME = process.env.DB_NAME || 'blinkbox_users';
const url = `http://${DB_URL}:${DB_PORT}/`;
const dbUrl = url + DB_NAME

const secret = process.env.JWT_SECRET || 'blinkbox is cool';

let Auth = {};

Auth.checkDB = request.head(dbUrl)
    .then((body) => Promise.resolve(body))
    .catch(() => request.put(dbUrl));

Auth.create = (id) => request.get(`${dbUrl}/${id}`)
    .then((user) => {
        user = JSON.parse(user);

        // not confirmed
        if (user.notValidated) {
            return {
                status: status.UNAUTHORIZED,
                body: {
                    status: 'Email not confirmed'
                }
            };
        }

        if (user.token) {
            // token exists
            const currentDate = new Date();
            if (user.expDate > currentDate) {
                // token expired
                return user;
            } else {
                // token already exists
                return {
                    status: status.FOUND,
                    body: {
                        token: user.token,
                        expDate: user.expDate
                    }
                };
            }
        } else {
            // token doesn't exists
            return user;
        }
    }).then((user) => {
        if (user.status) {
            return user;
        } else {
            // creates token
            let expiry = new Date();
            expiry.setDate(expiry.getDate() + 7);

            const expDate = parseInt(expiry.getTime() / 1000);
            user.token = jwt.sign({
                id: user.id,
                email: user.email,
                name: user.name,
                exp: expDate
            }, secret);
            user.expDate = expDate;

            return request({
                method: 'PUT',
                url: `${dbUrl}/${id}`,
                json: user
            }).then(() => ({
                status: status.CREATED,
                body: {
                    token: user.token,
                    expDate: user.expDate
                }
            }));
        }
    });

Auth.validate = (token) => new Promise((resolve, reject) => {
    try {
        const decoded = jwt.verify(token.token, secret);
        resolve(decoded);
    } catch (err) {
        reject(err);
    }
});

Auth.emailVerification = (id) => request.get(`${dbUrl}/${id}`).then((user) => {
    user = JSON.parse(user);

    if (user.notValidated) {
        delete user.notValidated;

        return request({
            method: 'PUT',
            url: `${dbUrl}/${id}`,
            json: user
        });
    } else {
        return Promise.resolve({
            id, status: 'Already verified'
        });
    }
});

module.exports = Auth;
