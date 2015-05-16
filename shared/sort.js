/* Copyright (C) 2012 Ben Trask. All rights reserved. */
var sort;
try { sort = exports; } catch(e) { sort = {}; }

sort.numericStringCompare = function(a, b) {
	a = a.toLocaleLowerCase();
	b = b.toLocaleLowerCase();
	var ca, cb, diff;
	function numeric(c) {
		return c >= "0" && c <= "9";
	}
	for(var i = 0, j = 0; i < a.length && j < b.length; ++i, ++j) {
		ca = a[i];
		cb = b[j]; // TODO: Even better, just keep track of the positions and use .slice()
		if(numeric(ca) && numeric(cb)) {
			for(ca = [ca]; numeric(a[i + 1]); ++i) ca.push(a[i + 1]);
			for(cb = [cb]; numeric(b[j + 1]); ++j) cb.push(b[j + 1]);
			diff = parseInt(ca.join(""), 10) - parseInt(cb.join(""), 10);
		} else {
			diff = ca.localeCompare(cb);
		}
		if(diff) return diff;
	}
	return (a.length - i) - (b.length - j); // TODO: Should we be smarter about file extensions somehow?
};
