/* Copyright (C) 2012 Ben Trask. All rights reserved. */
var bt;
try { bt = exports; }
catch(e) { bt = {}; }

bt.exec = function(exp, str, func/* (cap1, cap2, etc) */) {
	var val = exp.exec(str);
	if(!val) return false;
	val = Array.prototype.slice.call(val, 1);
	func.apply(this, val);
	return true;
};
