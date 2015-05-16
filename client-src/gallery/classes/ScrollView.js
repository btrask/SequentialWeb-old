/* Copyright (C) 2012 Ben Trask. All rights reserved. */
function clickable(element) {
	return element && (element.getAttribute && element.getAttribute("data-clickable") || clickable(element.parentNode));
}

function ScrollView() {
	var view = this;
	var pos = new Point(0, 0);
	var scrollableRect = Rect.make(0, 0, 0, 0);
	var bounds = Rect.make(0, 0, 0, 0);
	var busy = false;
	function setPosition(p) {
		pos = p;
		if(!view.content) return;
		view.content.style.left = String(Math.round(pos.x)) + "px";
		view.content.style.top = String(Math.round(pos.y)) + "px";
	}

	view.reflow = function() {
		if(!view.content) return;
		var contentSize = Size.fromElement(view.content);
		bounds.s = Size.fromElement(view.element);
		var center = bounds.s.scale(1 / 2).difference(contentSize.scale(1 / 2)).pointFromOrigin().clamp(new Rect(new Point(0, 0), bounds.s));
		scrollableRect.s = contentSize.difference(bounds.s);
		scrollableRect.o = center.offset(scrollableRect.s.scale(-1));
		setPosition(pos.clamp(scrollableRect));
	};
	view.setContent = function(content) {
		view.content = content;
		setPosition(new Point(0, 0)); // TODO: Handle RTL.
		DOM.fill(view.element, content);
		view.reflow();
	};
	window.addEventListener("resize", view.reflow); // TODO: Handle IE.
	view.element = DOM.clone("scrollView", view);
	view.element.onmousedown = function(firstEvent) {
		if(clickable(firstEvent.target)) return true;
		if(busy) {
			firstEvent.preventDefault();
			return false;
		}
		busy = true;
		DOM.classify(view.element, "cursor-hidden"); // This doesn't take effect until the next mouse move, at least in Chrome and Safari, so do it immediately.
		var firstPoint = Point.fromEvent(firstEvent), latestPoint;
		var velocity = new Size(0, 0);
		var clicked = true;
		function recalculateVelocity() {
			var vector = latestPoint.distance(firstPoint).vector();
			vector.mag = Math.max(0, vector.mag - 48);
			vector.mag /= 5; // Linear adjustment seems pretty good TBH.
			velocity = vector.size();
			if(vector.mag) {
				clicked = false;
			}
		}
		var scrolling = setInterval(function() {
			var offset = pos.offset(velocity);
			var clamped = offset.clamp(scrollableRect);
			var recalc = false;
			if(offset.x !== clamped.x) {
				firstPoint.x = latestPoint.x + (latestPoint.x < firstPoint.x ? 24 : -24);
				recalc = true;
			}
			if(offset.y !== clamped.y) {
				firstPoint.y = latestPoint.y + (latestPoint.y < firstPoint.y ? 24 : -24);
				recalc = false;
			}
			setPosition(clamped);
			if(recalc) recalculateVelocity();
		}, 1000 / 30);
		var clickTimeout = setTimeout(function() {
			clicked = false;
		}, 1000 / 6);
		document.onmousemove = function(event) {
			latestPoint = Point.fromEvent(event);
			recalculateVelocity();
			event.preventDefault();
			return false;
		};
		document.onmouseup = function(event) {
			DOM.classify(view.element, "cursor-hidden", false);
			if(clicked && view.onclick) view.onclick(firstEvent);
			clearInterval(scrolling);
			clearTimeout(clickTimeout);
			document.onmousemove = null;
			document.onmouseup = null;
			busy = false;
			event.preventDefault();
			return false;
		};
		firstEvent.preventDefault();
		return false;
	};
	(function() {
		var velocity = new Size(0, 0);
		var arrows = {
			n: false,
			s: false,
			w: false,
			e: false
		};
		var scrolling = null;
		function updateArrowScrolling() {
			busy = arrows.n || arrows.s || arrows.w || arrows.e;
			velocity = new Size(0, 0);
			if(arrows.n) velocity.h += 10;
			if(arrows.s) velocity.h -= 10;
			if(arrows.w) velocity.w += 10;
			if(arrows.e) velocity.w -= 10;
			if(busy && !scrolling) scrolling = setInterval(function() {
				var offset = pos.offset(velocity);
				var clamped = offset.clamp(scrollableRect);
				setPosition(clamped);
			});
			else if(!busy && scrolling) {
				clearInterval(scrolling);
				scrolling = null;
			}
		}
		document.addEventListener("keydown", function(event) {
			if(busy && !scrolling) {
				event.preventDefault();
				return false;
			}
			var changed = false;
			switch(event.keyCode || event.which) {
				case 37: if(!arrows.w) changed = arrows.w = true; break;
				case 38: if(!arrows.n) changed = arrows.n = true; break;
				case 39: if(!arrows.e) changed = arrows.e = true; break;
				case 40: if(!arrows.s) changed = arrows.s = true; break;
			}
			if(changed) updateArrowScrolling();
		});
		document.addEventListener("keyup", function(event) {
			if(busy && !scrolling) {
				event.preventDefault();
				return false;
			}
			switch(event.keyCode || event.which) {
				case 37: arrows.w = false; break;
				case 38: arrows.n = false; break;
				case 39: arrows.e = false; break;
				case 40: arrows.s = false; break;
			}
			updateArrowScrolling();
		});
	})();
}
