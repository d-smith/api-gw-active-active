'use strict';

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies


module.exports.health = (event, context, callback) => {
      // create a response
      const response = {
        statusCode: 200,
        body: 'reached',
      };
      callback(null, response);
  
};
