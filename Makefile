CLIENT_SCRIPTS = shared/bt.js \
                 shared/sort.js \
                 client-src/gallery/utilities/DOM.js \
                 client-src/gallery/utilities/Geometry.js \
                 client-src/gallery/classes/Node.js \
                 client-src/gallery/classes/ScrollView.js \
                 client-src/gallery/classes/Index.js \
                 client-src/gallery/classes/Picker.js \
                 client-src/gallery/index.js

all: gzip

clean:
	-rm -rf client

client: client/robots.txt client/favicon.ico client/gallery/index.html client/gallery/index.js client/gallery/index.css client/gallery/folder.png

client/gallery/index.js: $(CLIENT_SCRIPTS)
	-mkdir -p $(dir $@)
	java -jar deps/compiler-latest/compiler.jar $(addprefix --js=,$+) --js_output_file=$@ #--compilation_level WHITESPACE_ONLY --formatting PRETTY_PRINT

client/gallery/index.css: client-src/gallery/index.css
	-mkdir -p $(dir $@)
	cat $+ | java -jar deps/yuicompressor-2.4.2/build/yuicompressor-2.4.2.jar --type css --charset utf-8 -o $@

client/%: client-src/%
	-mkdir -p $(dir $@)
	cp -R $< $@

gzip: client
	for F in `find client -type f ! -name '*.gz' ! -name '*.wav' ! -name '.*'`; do gzip -nc9 $$F > $$F.gz; done

release: gzip
	for F in `find client -type f ! -name '*.gz' ! -name '*.wav' ! -name '.*'`; do rm $$F; done

.PHONY: all clean gzip release
