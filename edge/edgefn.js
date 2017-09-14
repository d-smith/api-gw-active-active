var AWS = require('aws-sdk');
let agent = null;

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
    agent = proxy(proxyenv);
    
    AWS.config.update({
      httpOptions: { agent: agent }
    });
}
*/
// END COMMENTED SECTION


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
    
    console.log('ok health checks',ok);
    console.log('failed health checks', failed);
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
    console.log('Error response', err.message);
    callback(null, badResponse);
}

const getContent = function(hostname, uri, method, headers) {
    return new Promise((resolve, reject) => {
        const lib = require('https');
        const url = require('url');

        const endpoint = 'https://' + hostname + '/hc1' + uri;
        let options = url.parse(endpoint);
        options.headers = headers;

        options.agent = agent; //agent is not null when testing on corp network
        options.method = method;


        const request = lib.request(options, (res) => {
            console.log('working with response', res.statusCode);
 
            const body = [];

            res.on('data', (chunk) => body.push(chunk));

            res.on('end', () => {
                const theResponse = {}
                theResponse.statusCode = res.statusCode;
                theResponse.body = body.join('');
                theResponse.statusMessage = res.statusMessage;
                resolve(theResponse);
            });
        });

        request.on('error', (err) => reject(err));

        request.end();

    });
};



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

    const serverErrorResponse = {
        status: '500',
    };

    getContent(host, request.uri, request.method, callHeaders)
        .then(function(response) {

            //Form lambda edge response
            const myResponse = {
                status: response.statusCode,
                statusDescription: response.statusMessage,
                headers: {
                    'content-type': [{
                        key: 'Content-Type',
                        value: 'application/json'
                    }]
                }
                body: response.body
            }

            console.log('Responding with', myResponse)

            callback(null, myResponse);     
        })
        .catch((err) => {
            console.log('error handler for getContent');
            console.log(err.message);
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