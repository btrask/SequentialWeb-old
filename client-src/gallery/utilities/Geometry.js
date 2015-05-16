/* Copyright (C) 2012 Ben Trask. All rights reserved. */
var Geometry = {};
Geometry.clamp = function(min, val, max) {
	if(min > max) return max;
	if(val < min) return min;
	if(val > max) return max;
	return val;
}
Geometry.TAU = Math.PI * 2;

function Point(x, y) {
	this.x = x;
	this.y = y;
}
Point.prototype.toString = function() {
	return "{"+this.x+", "+this.y+"}";
};
Point.prototype.offset = function(size) {
	return new Point(this.x + size.w, this.y + size.h);
};
Point.prototype.clamp = function(rect) {
	var x = rect.o.x, y = rect.o.y;
	return new Point(Geometry.clamp(x, this.x, x + rect.s.w), Geometry.clamp(y, this.y, y + rect.s.h));
};
Point.prototype.distance = function(that) {
	return new Size(this.x - that.x, this.y - that.y);
};
Point.fromEvent = function(event) {
	return new this(event.clientX, event.clientY);
};

function Size(w, h) {
	this.w = w;
	this.h = h;
}
Size.prototype.toString = function() {
	return "{"+this.w+", "+this.h+"}";
};
Size.prototype.sum = function(that) {
	return new Size(this.w + that.w, this.h + that.h);
};
Size.prototype.difference = function(that) {
	return new Size(this.w - that.w, this.h - that.h);
};
Size.prototype.scale = function(x, y) {
	if(arguments.length < 2) y = x;
	return new Size(this.w * x, this.h * y);
};
Size.prototype.vector = function() {
	return new Vector(Math.atan2(this.h, this.w) / Geometry.TAU, Math.sqrt(this.w * this.w + this.h * this.h));
};
Size.prototype.pointFromOrigin = function() {
	return new Point(this.w, this.h);
};
Size.fromElement = function(element) {
	return new this(element.offsetWidth, element.offsetHeight);
};

function Rect(o, s) {
	if(!(o instanceof Point)) throw "Invalid origin";
	if(!(s instanceof Size)) throw "Invalid size";
	this.o = o;
	this.s = s;
}
Rect.prototype.toString = function() {
	return "{"+this.o+", "+this.s+"}";
};
Rect.prototype.inset = function(size) {
	return new Rect(this.o.offset(size), this.s.difference(size));
};
Rect.make = function(x, y, w, h) {
	return new this(new Point(x, y), new Size(w, h));
};

function Vector(dir, mag) {
	this.dir = dir;
	this.mag = mag;
}
Vector.prototype.toString = function() {
	return "{"+this.dir+", "+this.mag+"}";
};
Vector.prototype.size = function() {
	return new Size(Math.cos(Geometry.TAU * this.dir) * this.mag, Math.sin(Geometry.TAU * this.dir) * this.mag);
};
