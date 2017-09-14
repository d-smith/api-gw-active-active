



const getContent = function(hostname, uri, method, headers) {
    return new Promise((resolve, reject) => {
        const lib = require('https');
        const url = require('url');

        console.log('building options');

        const endpoint = 'https://' + hostname + '/hc1' + uri;
        console.log('parse this', endpoint);
        let options = url.parse(endpoint);
        options.port = 443;

        console.log('initial options', options);

        options.headers = headers;

        const HttpsProxyAgent = require('https-proxy-agent');
        var agent = new HttpsProxyAgent(process.env.http_proxy);

        options.agent = agent;
        options.method = method;

        /*const options = {
            agent: agent,
            hostname: hostname,
            headers: headers,
            method: method,
            uri: uri
        };*/

        //console.log(options);

        const request = lib.request(options, (res) => {
            console.log('working with response');
            if (res.statusCode < 200 || res.statusCode > 299) {
                reject(new Error('call failure, status code ' + res.statusCode));
            }

            const body = [];

            res.on('data', (chunk) => body.push(chunk));

            res.on('end', () => resolve(body.join('')));
        });

        request.on('error', (err) => reject(err));

        request.end();

    });
};


const invoke = (host, request, callback) => {

    let callHeaders = {
        'x-api-key':'17a981c9-779c-4727-91e9-ee105374fb24'
    }

    console.log('callHeaders', callHeaders);

    const serverErrorResponse = {
        status: '500',
    };

    getContent(host, request.uri, request.method, callHeaders)
        .then((html) => console.log(html))
        .catch((err) => console.error(err));
    
}

const request = {
    uri:'/todos/',
    method:'GET'
};

invoke('0ek5kcs12k.execute-api.us-east-1.amazonaws.com', request,null);