#!/bin/bash

# Grab the physical id
# aws cloudformation describe-stack-resources --stack-name gw-sample-code-build --logical-resource-id=CodeBuildServerlessRole

if [ "$#" -ne 1 ]; then
    echo "Usage: create-deploy <code build resource id>"
    exit 1
fi

aws cloudformation create-stack --stack-name gw-sample-deploy \
--template-body file://deploy.yml \
--parameters ParameterKey=ArtifactBucket,ParameterValue=97068-built-artifacts \
ParameterKey=CodeBuildRoleId,ParameterValue=$1 \
--capabilities CAPABILITY_IAM