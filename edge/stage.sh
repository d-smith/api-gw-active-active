#!/bin/bash

for f in *.y*ml; do aws s3 cp $f s3://$CF_BUCKET; done
for f in *.zip; do aws s3 cp $f s3://$CF_BUCKET; done
