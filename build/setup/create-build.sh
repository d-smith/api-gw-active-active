#!/bin/bash
aws cloudformation create-stack --stack-name gw-sample-code-build \
--template-body file://codebuild.yml \
--capabilities CAPABILITY_IAM