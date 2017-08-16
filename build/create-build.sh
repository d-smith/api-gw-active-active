#!/bin/bash
aws cloudformation create-stack --stack-name gw-sample-code-build \
--template-body file://codebuild.yml \
--parameters ParameterKey=ArtifactBucket,ParameterValue=97068-built-artifacts \
--capabilities CAPABILITY_IAM