#!/bin/bash
stage=$1
region=$2
stage+="-serverless-rest-api-with-dynamodb"
echo $stage
aws apigateway get-rest-apis
qs="'items[?name==\`"
qs+=$stage
qs+="\`].{id:id}'"
id=`eval aws apigateway get-rest-apis --region $region --query $qs --output text`
echo modify $id
aws apigateway update-rest-api --region $region --rest-api-id $id --patch-operations op=replace,path=/endpointConfiguration/types/EDGE,value=REGIONAL