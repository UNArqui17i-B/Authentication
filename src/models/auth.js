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
            body = JSON.parse(body);
            if (body && !body.error) {
                func(null, {statusCode: status.FOUND}, body);
            } else {
                let expiry = new Date();
                expiry.setDate(expiry.getDate() + 7);

                const token = jwt.sign({
                    id: user.id,
                    rev: user.rev,
                    email: user.email,
                    name: user.name,
                    exp: parseInt(expiry.getTime() / 1000),
                }, secret);

                request({
                    method: 'PUT',
                    url: `${dbUrl}/${user.id}?new_edits=false`,
                    json: {
                        token: token,
                        rev: user.rev
                    }
                }, func);
            }
        }
    });
};

Auth.validate = (token, rev, func) => {
    jwt.verify(token.token, secret, (err, decoded) => {
        console.log(decoded);
        console.log(`${dbUrl}/${decoded.id}?rev=${decoded.rev}`);
        if (err) {
            func(err, {statusCode: status.BAD_REQUEST})
        } else {
            request.get(`${dbUrl}/${decoded.id}?rev=${decoded.rev}`, func);
        }
    });
};

module.exports = Auth;
