/* Copyright (C) 2012 Ben Trask. All rights reserved. */
/*bt.exec(/^\/file(\/.*)$/, unescape(decodeURI(window.location.pathname)), function(filename) {
	var index = new Index();
	index.create(filename || "/");
	document.body.appendChild(index.element);
});*/

bt.exec(/^(\/[\w]+)(\/?.*)$/, unescape(decodeURI(window.location.pathname)), function(scheme, path) {
	var index = new Index();
	var root = index.root = new Node(null, scheme);
	index.async(function(done) {
		root.descendant(path).load(function(node) {
			if(node.viewable()) return index.setCurrentNode(node, done);
			node.pageNext(true, true, function(node) {
				index.setCurrentNode(node, done);
			});
		});
	});
	document.body.appendChild(index.element);
});


