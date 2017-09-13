var AWS = require('aws-sdk');

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
//END COMMENTED SECTION

var route53 = new AWS.Route53();

const primaryHealthCheckId = '###PRIMARY_HEALTH_CHECK_ID###';
const primaryEndpoint = '###PRIMARY_ENDPOINT###';
const secondaryHealthCheckId = '###SECONDARY_HEALTH_CHECK_ID###';
const secondaryEndpoint = '###SECONDARY_ENDPOINT###';

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

const callPrimaryApiGatewayOrigin = (request, callback) => {
    console.log('call primary');
    //Need to absorb errors generated by call and send appropriate
    //response to avoid falling through to secondary call
    request.host = primaryEndpoint;
    callback(null, request);
}

const callSecondaryApiGatewayOrigin = (request,callback) => {
    console.log('call secondary');
    request.host = secondaryEndpoint;
    callback(null, request);
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