/* Copyright (C) 2012 Ben Trask. All rights reserved. */
var Stream = require("stream");
var util = require("util");

function ReadWriteStream() {
	Stream.call(this);
	this.readable = true;
	this.writable = true;
	this._paused = false;
	this._queue = [];
}
util.inherits(ReadWriteStream, Stream);
ReadWriteStream.prototype.write = function(chunk) {
	this.emit("data", chunk);
	return true;
};
ReadWriteStream.prototype.end = function() {
	this.emit("end");
};
/*ReadWriteStream.prototype.pause = function() {
	this._paused = true;
};
ReadWriteStream.prototype.resume = function() {
	if(!this._paused) return;
	var queue = this._queue;
	this.queue = [];
	this._paused = false;
	for(var i = 0; i < queue.length; ++i) queue[i]();
};
ReadWriteStream.prototype.queue = function(func) {
	var stream = this;
	return function(arg1, arg2, etc) {
		var obj = this;
		var args = arguments;
		if(stream._paused) stream._queue.push(function() {
			func.apply(obj, args);
		});
		else func.apply(obj, args);
	};
};*/
module.exports = ReadWriteStream;
