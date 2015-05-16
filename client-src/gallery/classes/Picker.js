/* Copyright (C) 2012 Ben Trask. All rights reserved. */
function Picker(index) {
	var picker = this;
	picker.content = DOM.clone("picker", picker);
	picker.index = index;
	picker.scrollView = new ScrollView();
	picker.scrollView.onclick = function() {
		picker.close();
	};
	picker.show(index.node);
	picker.scrollView.setContent(picker.content);
	picker.element = picker.scrollView.element;
}
Picker.prototype.show = function(node, selectedNode, childElement, parentNode) {
	var picker = this;
	var selectedThumbnail;
	var elems, element, thumbnail;
	function select(node, thumbnail) {
		if(selectedThumbnail) DOM.classify(selectedThumbnail, "selected", false);
		selectedNode = node;
		selectedThumbnail = thumbnail;
		DOM.classify(selectedThumbnail, "selected", true);
	}
	function onclick(node, thumbnail) {
		return function(event) {
			var newChildElement;
			if(node.page) {
				picker.index.setCurrentNode(node);
				picker.close();
			} else if(selectedNode !== node) {
				select(node, thumbnail);
				newChildElement = picker.show(node, null, null, node);
				childElement.parentNode.replaceChild(newChildElement, childElement);
				childElement = newChildElement;
				picker.scrollView.reflow();
			}
			event.preventDefault();
			return false;
		};
	}

	if(node.items.length) {
		elems = {};
		element = document.createElement("div");
		if(!childElement) childElement = document.createElement("div");
		element.appendChild(childElement);
		element.appendChild(DOM.clone("thumbnailFolder", elems));
		DOM.fill(elems.title, node.path);
		for(var i = 0; i < node.items.length; ++i) {
			thumbnail = node.items[i].thumbnail(picker.scrollView.reflow);
			if(selectedNode === node.items[i]) {
				selectedThumbnail = thumbnail;
				DOM.classify(selectedThumbnail, "selected");
			}
			elems.thumbnails.appendChild(thumbnail);
			thumbnail.onclick = onclick(node.items[i], thumbnail);
		}
	}
	if(parentNode) return element; // TODO: This is a bit messy, clean it up.
	if(node.parent) picker.show(node.parent, node, element);
	else DOM.fill(picker.content, element);
};
Picker.prototype.close = function() {
	var picker = this;
	DOM.remove(picker.element);
	if(picker.onclose) picker.onclose();
};
