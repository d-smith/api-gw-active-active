#!/bin/bash
stage=$1
stage+="-serverless-rest-api-with-dynamodb"
echo $stage
aws apigateway get-rest-apis
qs="'items[?name==\`"
qs+=$stage
qs+="\`].{id:id}'"
id=`eval aws apigateway get-rest-apis --query $qs --output text`
echo modify $id