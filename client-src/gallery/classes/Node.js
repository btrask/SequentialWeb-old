/* Copyright (C) 2012 Ben Trask. All rights reserved. */

function AJAXRequest() { // TODO: Put this somewhere.
	if(window.ActiveXObject) {
		try { return new ActiveXObject("Msxml2.XMLHTTP"); } catch(e) {}
		try { return new ActiveXObject("Microsoft.XMLHTTP"); } catch(e) {}
	}
	try { return new XMLHttpRequest(); } catch(e) {}
}
function asyncLoop(func/* (next) */) { // TODO: Put this somewhere too.
	var called, async;
	for(;;) {
		called = false;
		async = false;
		func(function next() {
			called = true;
			if(async) asyncLoop(func);
		});
		async = true;
		if(!called) break;
	}
}

function Node(parent, name) {
	var node = this;
	node.parent = parent;
	node.name = null;
	node.path = null;
	node.loaded = false;
	node.encrypted = false;
	node.image = null;
	node.thumb = null;
	node.items = [];
	node.itemByName = {};
	node.size = null;
	node.created = null;
	node.modified = null;
	node.setName(name || "");
}
Node.prototype.toString = function() {
	return "{ page: "+this.page+", items: "+this.items.length+" }";
};
Node.prototype.setName = function(name) {
	var node = this;
	node.name = name;
	node.path = (node.parent ? node.parent.path+"/" : "")+name;
};
Node.prototype.viewable = function() {
	return this.image || this.encrypted;
};
Node.prototype.load = function(callback/* (node) */) {
	var node = this;
	if(node.loaded) return callback(node);
	var req = AJAXRequest();
	req.open("GET", node.path+"?json", true);
	req.onreadystatechange = function() {
		if(4 !== req.readyState) return;
		// TODO: If we stop using HTTP status codes and start sending per-node status information, then we can merge all of this into node._update().
		node.loaded = true;
		node.encrypted = false;
		if(200 === req.status) {
			node._update(JSON.parse(req.responseText));
			if(node.parent) node.parent.itemByName[node.name] = node;
			callback(node);
		} else if(401 === req.status) {
			node.encrypted = true;
			callback(node);
		} else if(403 === req.status) {
			callback(node);
		} else if(404 === req.status) {
			// TODO: Remove node?
			if(node.parent) node.parent.load(callback);
			else callback(null);
		} else {
			console.log("Unknown status code", req.status);
		}
	};
	req.send("");
};
Node.prototype._update = function(obj) {
	var node = this;
	if(obj.name) node.setName(obj.name); // FIXME: Hack for /, which gets named "".
	node.image = obj.image;
	node.thumb = obj.thumb;
	if(obj.items) node._updateItems(obj.items);
};
Node.prototype._updateItems = function(items) {
	var node = this;
	var old = node.itemByName;
	var item;
	node.loaded = true;
	node.items = [];
	node.itemByName = {};
	for(var i = 0; i < items.length; ++i) {
		if(old.hasOwnProperty(items[i].name)) {
			item = old[items[i].name];
		} else {
			item = new Node(node);
		}
		item._update(items[i]);
		node.items.push(item);
		node.itemByName[item.name] = item;
	}
	node.items.sort(Node.compare);
};
Node.prototype.descendant = function(path) {
	var node = this
	var item = node;
	bt.exec(/^\/?([^\/]+)(\/.*)?$/, path, function(name, subpath) {
		if(node.itemByName.hasOwnProperty(name)) {
			item = node.itemByName[name];
		} else {
			item = new Node(node, name);
			node.items.push(item);
			node.itemByName[item.name] = item;
		}
		if(subpath) item = item.descendant(subpath);
	});
	return item;
};
Node.prototype.show = function(callback/* (err, element) */) {
	var node = this;
	if(!node.viewable()) return callback(false);
	var elems = {};
	var element = DOM.clone("image", elems);
	elems.image.src = node.image;
	elems.image.onload = function() {
		if(callback) callback(null, element);
	};
	elems.title.onclick = function(event) {
		page.index.showPicker(); // TODO: Replace the index with something else.
		event.preventDefault();
		return false;
	};
	DOM.fill(elems.title, node.name);
	history.pushState("", "", node.path);
	document.title = node.name+" - SequentialWeb";
};
Node.compare = function(a, b) {
	return sort.numericStringCompare(a.name || "", b.name || ""); // TODO: Support sort options.
};

Node.prototype.outwardSearch = function(forward, child, includeChild, search/* (node, callback (result)) */, callback/* (node) */) {
	var node = this;
	function continueOutward() {
		node.parentOutwardSearch(forward, node, false, search, callback);
	}
	node.load(function(loadedNode) {
		if(loadedNode !== node) return continueOutward();
		var items = node.items.slice(); // Protect from mutations.
		var increment = forward ? 1 : -1;
		var i = items.indexOf(child);
		console.assert(-1 !== i);
		if(!includeChild) i += increment;
		asyncLoop(function(next) {
			if(i < 0 || i >= items.length) return continueOutward();
			search(items[i], function(result) {
				if(result) return callback(result);
				i += increment;
				next();
			});
		});
	});
};
Node.prototype.parentOutwardSearch = function(forward, child, includeChild, search/* (node) */, callback/* (node) */) {
	var node = this;
	if(node.parent) node.parent.outwardSearch(forward, child, includeChild, search, callback);
	else callback(null);
};
Node.prototype.pageNext = function(next, children, callback/* (node) */) {
	var node = this;
	function pageInnerOrOuter() {
		node.pageFirst(next, null, false, function(node) {
			if(node) callback(node);
			else pageOuter(callback);
		});
	}
	function pageOuter() {
		node.parentOutwardSearch(next, node, false, function(node, callback) {
			node.pageFirst(next, null, true, callback);
		}, callback);
	}
	if(next && children) pageInnerOrOuter();
	else pageOuter();
};
Node.prototype.pageFirst = function(first, descendentToStopAt, includeSelf, callback/* (node) */) {
	var node = this;
	var i, step, result;
	if(descendentToStopAt === node) return callback(null);
	node.load(function(loadedNode) {
		if(loadedNode !== node) return callback(null);
		var items = node.items.slice(); // Protect from mutations.
		var useSelf = includeSelf && node.viewable();
		if(first) {
			if(useSelf) return callback(node);
			i = 0;
			step = 1;
		} else {
			i = items.length - 1;
			step = -1;
		}
		asyncLoop(function(next) {
			if(i < 0 || i >= items.length) return stop();
			items[i].pageFirst(first, descendentToStopAt, true, function(result) {
				if(result) callback(result);
				else if(descendentToStopAt && descendentToStopAt.ancestorChildOf(node) === items[i]) callback(null);
				else {
					i += step;
					next();
				}
			});
		});
		function stop() {
			if(!first && useSelf) callback(node);
			else callback(null);
		}
	});
};
Node.prototype.ancestorChildOf = function(other) {
	var node = this;
	if(!node.parent) return null;
	if(node.parent === other) return node;
	return node.parent.ancestorChildOf(other);
};
/*Node.prototype.thumbnail = function(loaded/* (element) *|/) {
	var node = this;
	var elems = {};
	var element = DOM.clone("thumbnail", elems);
	if(node.page) {
		elems.image.src = "/thumb/"+node.page.url;
		elems.image.onload = function() {
			if(loaded) loaded(element);
		};
	} else {
		elems.image.src = "/gallery/folder.png";
		DOM.classify(element, "preview", false);
	}
	DOM.fill(elems.title, node.name);
	return element;
};
*/
