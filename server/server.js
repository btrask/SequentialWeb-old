#!/usr/bin/env node
/* Copyright (C) 2012 Ben Trask. All rights reserved. */

var http = require("http");
var fs = require("fs");
var pathModule = require("path");
var urlModule = require("url");
var zlib = require("zlib");
var proc = require("child_process");

var exec = require("../shared/bt").exec;
var mime = require("./mime.json");

var DATA = process.env.HOME+"/Library/Application Support/SequentialWeb";
var ROOT = process.argv[2] || "";
var PORT = 8001;

/*(function() {
	var interface;
	var platform = {};
	var action = {};
	platform.darwin = function() {
		interface = proc.execFile(process.env["SL_GUI_PATH"], [], {env: {"SL_SERVER_INTERFACE": "true", "SL_PORT": String(PORT), "NSUnbufferedIO": "YES"}});
		platform.open = function(url) {
			proc.spawn("open", ["-b", "org.chromium.Chromium", url], {});
		};
	};
	action.open = function(message) {
		platform.open("http://"+message.host+":"+PORT+"/file/");
	};
	if(platform.hasOwnProperty(process.platform)) platform[process.platform]();
	(function() {
		var str = "";
		interface.stdout.setEncoding("utf8");
		interface.stdout.on("data", function(chunk) {
			str += chunk;
			var i = str.indexOf("\n"), json, message;
			while(-1 !== i) {
				json = str.slice(0, i);
				str = str.slice(i + 1);
				message = JSON.parse(json);
				if(action.hasOwnProperty(message.action)) action[message.action](message);
				i = str.indexOf("\n");
			}
		});
	})();
	interface.on("exit", function() {
		process.exit();
	});
})();*/

/*if(Object.prototype.hasOwnProperty.call(process.env, "ppid")) {
	var posix = require("posix");
	setInterval(function() {
		if(process.env.ppid != posix.getppid()) process.exit();
	}, 1000);
}*/

/*process.on("uncaughtException", function(e) {
	console.log(e);
	console.log(e.stack);
});*/

function extname(path) {
	return pathModule.extname(path).toLowerCase();
}
function contentType(path) {
	var ext = extname(path);
	if(!mime.hasOwnProperty(ext)) return "application/octet-stream";
	var type = mime[ext];
	if("text/" === type.slice(0, 5)) type += "; charset=utf-8";
	return type;
}
function isImage(path) {
	return { ".jpeg": 1, ".jpg": 1, ".png": 1, ".gif": 1 }.hasOwnProperty(extname(path));
}
function isBundle(path) {
	return { ".app": 1, ".nib": 1, ".lproj": 1 }.hasOwnProperty(extname(path));
}

function valid(path, callback/* (flag, noValidSubpaths) */) {
	if(null === path) return callback(false);
	if("/" === path) path = "";
	valid(path ? pathModule.dirname(path) : null, function(flag, noValidSubpaths) {
		if(flag || noValidSubpaths) callback(flag, noValidSubpaths);
		else fs.exists(DATA+"/open"+path+".open", function(flag) {
			if(flag) callback(flag);
			else fs.exists(DATA+"/open"+path, function(flag) {
				callback(false, !flag);
			});
		});
	});
}
function stats(path, callback/* (err, stats, dir) */) {
	fs.stat(path, function(err, stats) {
		if(err) return callback(err, null);
		var file = stats.isFile();
		var dir = stats.isDirectory();
		var image = file && isImage(path);
		callback(null, file || dir ? {
			name: pathModule.basename(path),
			size: stats.size,
			created: stats.ctime.getTime(),
			modified: stats.mtime.getTime(),
			image: image ? "/image"+path : undefined,
			thumb: image ? "/thumb"+path : "/gallery/folder.png",
			items: dir ? undefined : []
		} : null, dir);
	});
}
function ls(path, callback/* (err, items) */) {
	fs.readdir(path, function(err, files) {
		if(err) return callback(err);
		var items = [];
		var remaining = 1;
		for(var i = 0; i < files.length; ++i) {
			if("." === files[i][0]) continue;
			if(isBundle(files[i])) continue;
			++remaining;
			stats(path+"/"+files[i], function(err, stats) {
				if(!err && stats) items.push(stats);
				if(!--remaining) callback(null, items);
			});
		}
		if(!--remaining) callback(null, items);
	});
}

function sendFile(req, res, path) {
	fs.exists(path+".gz", function(gz) {
		var stream = fs.createReadStream(path+(gz ? ".gz" : "")), head = false;
		stream.on("data", function(chunk) {
			var headers;
			if(!head) {
				headers = { "content-type": contentType(path) };
				if(gz) headers["content-encoding"] = "gzip";
				res.writeHead(200, headers);
				head = true;
			}
			res.write(chunk);
		});
		stream.on("end", function() {
			res.end();
		});
		stream.on("error", function(err) {
			sendFSError(req, res, err);
		});
	});
}
function sendHTTPError(req, res, status, message, log) {
	console.log(status, log || "");
	res.writeHead(status, {"content-type": "text/plain; charset=utf-8"});
	res.end(message || "", "utf8");
}
function sendFSError(req, res, err) {
	var errors = {
		"ENOENT": {status: 404, message: "Not Found"},
		"EACCES": {status: 403, message: "Forbidden"}
	};
	if(err && errors.hasOwnProperty(err.code)) {
		sendHTTPError(req, res, errors[err.code].status, errors[err.code].message, err.path);
	} else {
		sendHTTPError(req, res, 500, "Internal Server Error", err);
	}
}
function sendJSON(req, res, obj) {
	zlib.gzip(new Buffer(JSON.stringify(obj)), function(err, buf) {
		if(err) return sendFSError(req, res, err);
		res.writeHead(200, {
			"content-type": "text/json; charset=utf-8",
			"content-length": buf.length,
			"content-encoding": "gzip"
		});
		res.end(buf);
	});
}
function sendValidation(req, res, path, func) {
	// TODO: We can also check IPs or rate-limit here, if we want to.
	valid(path, function(flag) {
		if(!flag) sendHTTPError(req, res, 403, "Forbidden", path);
		else func();
	});
}
http.createServer(function(req, res) {
	var url = urlModule.parse(req.url);
	var fullpath = decodeURI(url.pathname) || "/";
	// TODO: This could almost be refactored into a switch statement or something simpler.
	exec(/^\/image(\/.*|)$/, fullpath, function(path) {
		sendValidation(req, res, ROOT+path, function() {
			if(!isImage(path)) sendHTTPError(req, res, 415, "Unsupported Media Type", path);
			else sendFile(req, res, ROOT+path);
		});
	}) ||
	exec(/^\/thumb(\/.*|)$/, fullpath, function(path) {
		sendValidation(req, res, ROOT+path, function() {
			res.writeHead(200, {
				"content-type": "image/jpeg"
			});
			proc.spawn("convert", ["-size", "128x128", ROOT+path, "-coalesce", "-thumbnail", "128x128", "-quality", "50", "-"]).stdout.pipe(res); // TODO: Handle 404 and other errors. Eventually, caching too.
		});
	}) ||
	exec(/^\/file(\/.*|)$/, fullpath, function(path) {
		switch(url.query || "") {
		case "":
			sendFile(req, res, __dirname+"/../client/gallery/index.html");
			break;
		case "json":
			if("/" === path) path = "";
			if(path) path = pathModule.normalize(path); // normalize("") causes infinite recursion, lol.
			sendValidation(req, res, ROOT+path, function() {
				stats(ROOT+path || "/", function(err, stats, dir) {
					if(err) sendFSError(req, res, err);
					else if(!dir) sendJSON(req, res, stats);
					else ls(ROOT+path || "/", function(err, items) {
						if(err) return sendFSError(req, res, err);
						stats.items = items;
						sendJSON(req, res, stats);
					});
				});
			});
			break;
		default:
			sendHTTPError(req, res, 400, "Bad Request", url.query);
			break;
		}
	}) ||
	(function() {
		if("/" === fullpath[fullpath.length - 1]) path += "index.html";
		sendFile(req, res, __dirname+"/../client"+pathModule.normalize(fullpath));
	})();
}).listen(PORT, null);
