var AWS = require('aws-sdk');
var rp = require('request-promise-native');

// Comment out this block or you will have to upload
// the proxy agent dependency in the lambda package. With
// the following uncommented you can test locally via
// lambda-local -f edgefn.js
// BEGIN COMMENTED SECTION
/*

const proxyenv = process.env.http_proxy;
console.log('proxyenv is', proxyenv);
if (proxyenv != "") {
    console.log("Using proxy", proxyenv);
    var proxy = require('proxy-agent');
    
    AWS.config.update({
      httpOptions: { agent: proxy(proxyenv) }
    });
}
*/
var route53 = new AWS.Route53();

const primaryHealthCheckId = '663ee70d-3aeb-413a-80ea-2ff29bf9d163';
const primaryEndpoint = '0ek5kcs12k.execute-api.us-east-1.amazonaws.com';
const secondaryHealthCheckId = 'cba8b6d5-9a90-435e-b377-f7ef4563196d';
const secondaryEndpoint = '16l579d9a3.execute-api.us-west-2.amazonaws.com';

const statusFromObservations = (observations) => {
    let ok =0;
    let failed = 0;
    for(let item of observations) {
        let statusReport = item.StatusReport;
        if (statusReport.Status.startsWith('Success')) {
            ok = ok + 1;
        } else {
            failed = failed + 1;
        }
    }
    
    console.log('ok',ok);
    console.log('failed', failed);
    if (ok <= failed) {
        throw new Error('endpoint is unhealthy');
    } else {
        return  Promise.resolve('ok');
    }
    
}

const status = function(data) {
    let observations = data.HealthCheckObservations;
    return statusFromObservations(observations);
}

const checkSecondary = (err) => {
    console.log('primary unhealthy, trying secondary');
    var params = {
        HealthCheckId: secondaryHealthCheckId /* required */
    };
    return route53.getHealthCheckStatus(params).promise();
}

const badResponse = {
    status: '502',
    statusDescription: 'Bad Gateway',
    body: 'No gateway origin available',
};

const doErrorResponse = (err, callback) => {
    console.log(err);
    callback(null, badResponse);
}

const invoke = (host, request, callback) => {

    let callHeaders = {}
    
    Object.keys(request.headers).forEach(function(key){
        let header = request.headers[key];
        console.log(header);
        header = header[0];
        if(header.key != 'Host') {
            callHeaders[header.key] = header.value
        }
    });


    console.log('callHeaders', callHeaders);

    var options = {
        method: request.method,
        uri: 'https://' + host + '/hc1' + request.uri,
        headers: callHeaders,
        resolveWithFullResponse: true,
        simple: false
    }

    const serverErrorResponse = {
        status: '500',
    };

    rp(options)
        .then(function(response) {
            console.log('response handler');
            console.log(response.statusCode);
            console.log(response.body);

            if (response.statusCode < 300) {
                callback(null, response.body);
            } else {
                const myResponse = {
                    status: response.statusCode,
                    statusDescription: response.statusMessage,
    
                }
                callback(response.body, null);
            }           
        })
        .catch(err => function(err){
            console.log('error handler');
            console.log(err);
            callback(null, serverErrorResponse);
        });

    
}

const callPrimaryApiGatewayOrigin = (request, callback) => {
    console.log('call primary');
    invoke(primaryEndpoint, request, callback);
}

const callSecondaryApiGatewayOrigin = (request,callback) => {
    console.log('call secondary');
    invoke(secondaryEndpoint, request, callback);
}

exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;

    var params = {
        HealthCheckId: primaryHealthCheckId
    };

    var primaryHealthStatus = route53.getHealthCheckStatus(params).promise();
        
    primaryHealthStatus
        .then(data => status(data))
        .then(() => callPrimaryApiGatewayOrigin(request, callback))
        .catch(err => checkSecondary(err)
                        .then(data => status(data))
                        .then(() => callSecondaryApiGatewayOrigin(request,callback))
                        .catch(err => doErrorResponse(err, callback))
              );
};