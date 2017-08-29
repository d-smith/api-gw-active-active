package:
	rm -f edgefn.zip
	zip edgefn.zip edgefn.js

deploy:
	aws s3 cp edgefn.zip s3://$(CF_BUCKET)
