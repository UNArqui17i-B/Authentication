'use strict';

const request = require('request-promise');
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

Auth.checkDB = request.head(dbUrl)
    .then((body) => Promise.resolve(body))
    .catch(() => request.put(dbUrl));

Auth.create = (id) => new Promise((resolve, reject) => {
    request.get(`${dbUrl}/${id}`)
        .then((body) => {
            body = JSON.parse(body);

            if (body.error) {
                reject(body.error);
            } else if (body.token) {
                // token already exists
                resolve({
                    status: status.FOUND,
                    body: {
                        token: body.token,
                        expDate: body.expDate
                    }
                });
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
                }).then(() => resolve({
                    status: status.CREATED,
                    body: {token, expDate}
                })).catch(reject);
            }
        }).catch(reject);
});

Auth.validate = (token) => new Promise((resolve, reject) => {
    try {
        const decoded = jwt.verify(token.token, secret);
        resolve(decoded);
    } catch (err) {
        reject(err);
    }
});

module.exports = Auth;
