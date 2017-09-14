package:
	rm -f edgefn.zip
	rm -f edgefn.js
	rm -rf node_modules
	cp ../edgefn.js .
	npm --production install
	zip -r edgefn.zip edgefn.js node_modules

package-in-place:
	rm -f edgefn.zip
	zip -r edgefn.zip edgefn.js node_modules
