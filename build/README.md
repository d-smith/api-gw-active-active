This directory contains a cloud formation template to instantiate
a pipeline with the sample github repo as the source repo, and
two CodeBuild stages, one to build and run tests, and one to do
a deploy via serverless.

The only input needed is a github OAuth token to grant access to the
repo. You can create a token via the github app - go to settings, tokens,
and take it from there.
