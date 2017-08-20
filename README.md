# API Gateway with a Cloud Front Origin

One annoyance with the current way the AWS Gateway in implemented is how it is 
wrapped in a cloud front distribution that defeats the ability to set up a multi-region
active-standby topology where clients use a single DNS API to access the API.

By using the pattern presented here, however, you can provide a single TLS-enabled
endpoint to you API consumers (assuming they support the [SNI](https://en.wikipedia.org/wiki/Server_Name_Indication) TLS extension) behind
which you can point from an active region to a stand by region.

## Pattern - CLoud Front with Stable CNAME and Replaceable API Gateway Origin

The pattern can be summarized as follows:

* Create you API gateway applications in multiple regions
* Create a cloud front distribution that contains your primary region's
API gateway url as an origin
* Associate an SSL certificate in ACM with a wildcard hostname for your api domain
name with the Cloud Front distribution embedding the API url as an origin
* Associate a CNAME in the cloud front distribution that is part of the domain
indicated in the certificate. This will be the API endpoint that clients will use.
* Create a route 53 alias using the CNAME that points to the cloud front distribution.

### Create the API Gateway Apps

This sample provides a serverless application - create the DynamoDB table in the regions you with to deploy to, then deploy the serverless app via `serverless deploy`

### Create the Cloud Front Distribution

Use the provided CDN cloud formation template, which uses an API gateway endpoint as the origin. 

For inputs:

* Use the API gateway stage endpoint as the APIEndpoint parameter value. This is the 
domain name without the stage or other URI components.
* Use the stage name for APIStage
* Provide the certificate ACM urn as CertificateArn. Note the domain name on the 
certificate itself should be a wildcard, for example *.something.net.
* Provide the CNAME to use for the distribution as the CName parameter. This should be aligned with the domain associated with the certificate, so for example if the
certificate is for *.something.net, the CName would look something like
api.something.net.

### Route 53 Alias

Use the `route53alias.yml` cloud formation template to set up an alias for the 
cloud front distribution you created above. You will need to provide your hosted
zone name, which your domain including the '.' at the end, the record set domain
name (which should match your Cloud Front CNAME), and the cloud front domain itself.

### Gateway Logging

The API Gateway supports logging information to cloud watch, which can be useful when 
troubleshooting. In order to enable logging, in the API gateway console under the 
Settings section, you must provide the ARN of a role with the appropriate entitlements.

The `gatewaylogrole.yml` Cloud Formation template can be used to create a role with
the requisite permissions.

### Manual Route Away

To do a manual route away, update the instantiation of the `cdn.yml` stack and
change the value of the APIEndpoint to point to the stand by endpoint domain address.

## Instantiate the Pattern Using Jupyter Notebook

The `cf_gateway.ipynb` notebook provides all the code needed to instantiate
the cloud formation templates to set up cloud front and the route 53 alias.
The notebook also includes a section for performing the manual route away.

Additionally the notebook includes a section for creating and configuring
a common key that can be used to access both API gateways, such that the 
endpoint and API key used by clients can be used regardless of the application
state (served from primary region, served from failover region)

## Code Pipeline

The build directory contains a cloud formation template that can
create an AWS Code Pipeline to build and deploy this project to
AWS.

To create a manually trigged build and deploy pipeline, use the 
`fullpipeline.yml` template. Note that auto triggering can be done by
setting PollForSourceChanges to true in the pipeline's source stage.

The template takes a single argument, which is an OAuth token to allow 
AWS to access the github.com repo. You can generate such as token via
your github's settings under the tokens section.

Note that the project currently hardcodes the stage names in the build spec files for the build and deploy stages, this will be parameterized at some point.


## TODO

* Detail how to set up API Key Synchronization between regions
* Build a health check into the API or maybe a cloudwatch metric and route away via a lambda function
* Add a diagram or two
* Environment vars for code build parts - parameterize the stage name