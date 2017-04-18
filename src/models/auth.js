'use strict';

const request = require('request-promise');
const status = require('http-status');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Joi = require('joi');

// CouchDB url
const DB_PORT = process.env.DB_PORT || 5984;
const DB_URL = process.env.DB_URL || 'localhost';
const DB_NAME = process.env.DB_NAME || 'blinkbox_users';
const url = `http://${DB_URL}:${DB_PORT}/`;
const dbUrl = url + DB_NAME;

const secret = process.env.JWT_SECRET || 'blinkbox is cool';

// User schema
const loginSchema = Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/).required()
});

let Auth = {};

Auth.checkDB = request.head(dbUrl)
    .then((body) => Promise.resolve(body))
    .catch(() => request.put(dbUrl));

Auth.create = (user) => new Promise(
    (resolve, reject) => {
        const result = Joi.validate(user, loginSchema);

        if (result.error) {
            reject(result.error);
        } else {
            const query = {
                selector: {
                    email: user.email
                }
            };

            resolve(request({
                method: 'POST',
                url: `${dbUrl}/_find`,
                json: query
            }));
        }
    }).then((body) => {
        const finded = body.docs[0];

        // decrypt password
        const hash = crypto.pbkdf2Sync(user.password, finded.salt, 1000, 224, 'sha224').toString('hex');
        if (hash === finded.hash) {
            return finded;
        } else {
            return {
                status: status.UNAUTHORIZED,
                body: {}
            };
        }
    }).then((user) => {
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
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                exp: expDate
            }, secret);
            user.expDate = expDate;

            return request({
                method: 'PUT',
                url: `${dbUrl}/${user._id}`,
                json: user
            }).then(() => Promise.resolve({
                status: status.CREATED,
                body: {
                    token: user.token,
                    expDate: user.expDate
                }
            })).catch((err) => Promise.reject(err));
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
