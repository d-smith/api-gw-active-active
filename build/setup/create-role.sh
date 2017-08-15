#!/bin/bash
aws cloudformation create-stack --stack-name code-build-role \
--template-body file://codebuild-role.yml \
--capabilities CAPABILITY_IAM