/* Copyright (C) 2012 Ben Trask. All rights reserved. */
function Index() {
	var index = this;
	index.element = DOM.clone("index", index);
	index.root = new Node();
	index.node = null;
	index.scrollView = new ScrollView()
	index.scrollView.onclick = function(event) {
		var forward = !event.shiftKey;
		index.async(function(done) {
			function fromRoot() {
				index.root.pageFirst(forward, null, true, function(node) {
					index.setCurrentNode(node, done);
				});
			}
			if(index.node) index.node.pageNext(forward, true, function(node) {
				if(node) index.setCurrentNode(node, done);
				else fromRoot();
			});
			else fromRoot();
		});
	};
	index.main.appendChild(index.scrollView.element);
}
Index.prototype.setCurrentNode = function(node, callback) {
	var index = this;
	index.node = node;
	if(node) node.show(function(err, element) {
		callback();
		index.scrollView.setContent(element);
	});
	else {
		callback();
		index.scrollView.setContent(null); // TODO: Display a message?
	}
};
Index.prototype.async = function(func/* (done) */) {
	var index = this, loading;
	var timeout = setTimeout(function() {
		loading = DOM.clone("loading");
		index.modal.appendChild(loading);
	}, 1000 * 0.25);
	return func(function done() {
		if(loading) DOM.remove(loading);
		clearTimeout(timeout);
	});
}
Index.prototype.create = function(path) {
	var index = this;
	var names = path.split("/");
	var node = index.root;
	for(var i = 0; i < names.length; ++i) {
		node = node.item(names[i]);
	}
};
/*Index.prototype.load = function(hash, filename) { // Obsolete?
	var index = this;
	var req = AJAXRequest();
	var node = index.root;
	var base = node.path = hash+"/";
	var lengthRead = 0;
	var parent;
	req.open("GET", "/index/"+hash+"/?r=" + +new Date(), true);
	req.onreadystatechange = function() {
		if(4 === req.readyState) {
			if(!index.node) index.setCurrentNode(index.root.pageFirst(true));
			return;
		}
		var str = req.responseText.slice(lengthRead), len, name;
		for(;;) {
			len = str.indexOf("\n");
			if(-1 === len) break;
			name = str.slice(0, len);
			str = str.slice(len + 1);
			lengthRead += len + 1;
			if("../" === name) {
				if(node === index.node) index.setCurrentNode(node.pageFirst(true));
				node = node.parent;
			} else if("/" === name[name.length - 1]) {
				parent = node;
				node = new Node(parent);
				node.path = parent.path + name;
				node.name = name.slice(0, -1);
				parent.items.push(node);
				if(!index.node && filename && (base+filename === node.path || base+filename+"/" === node.path)) index.setCurrentNode(node);
			} else {
				parent = node;
				node = new Node(parent);
				node.path = parent.path + name;
				node.name = name;
				node.page = new Page(index, node, node.path);
				parent.items.push(node);
				if(!index.node && (!filename || base+filename === node.path)) index.setCurrentNode(node);
				node = parent;
			}
		}
	};
	req.send("");
};*/
Index.prototype.showPicker = function() {
	var index = this;
	var picker = new Picker(index);
	DOM.classify(index.scrollView.element, "inactive");
	picker.onclose = function() {
		DOM.classify(index.scrollView.element, "inactive", false);
	};
	index.element.appendChild(picker.element);
	
};
