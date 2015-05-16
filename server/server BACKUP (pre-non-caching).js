#!/usr/bin/env node
/* Copyright (C) 2012 Ben Trask. All rights reserved. */

var http = require("http");
var fs = require("fs");
var pathModule = require("path");
var crypto = require("crypto");
var url = require("url");
var zlib = require("zlib");
var proc = require("child_process");

var exec = require("../shared/bt").exec;
var ReadWriteStream = require("./ReadWriteStream");
var mime = require("./mime.json");

var CACHE = pathModule.join(process.env.HOME, "/Library/Caches/SequentialWeb"); // WHY is this so difficult? ...Because Windows?
var SALT = "asdf";
var fourccs = {
	/* PNG */ 0x89504E47: true,
	/* JPG */ 0xFFD8FFE0: true,
	/* JPG */ 0xFFD8FFDB: true,
	/* GIF */ 0x47494638: true,
}; // If we store the hex as strings, we can use something like hasPrefix() to check variable lengths.

if(process.argv[2]) open(process.argv[2]); // FIXME: Need proper opening/updating support.

function mkdirRecursive(filename, callback/* (err) */) {
	fs.mkdir(filename, function(err) {
		if(err) {
			if("ENOENT" === err.code) {
				mkdirRecursive(pathModule.dirname(filename), function(err) {
					if(err) return callback(err);
					mkdirRecursive(filename, callback);
				})
			} else if("EEXIST" === err.code) {
				callback(null);
			} else {
				callback(err);
			}
		} else {
			callback(null);
		}
	});
}
var slashes = new RegExp("\/", "g"); // The expression /\// breaks my editor...
function getHash(filename) {
	var sha1 = crypto.createHash("sha1");
	sha1.update(SALT+filename, "utf8");
	return sha1.digest("base64").slice(0, 11).replace(slashes, "_").replace(/\+/g, "-");
}
function getHashDirPath(hash) {
	return pathModule.join(CACHE, "/hashes", hash.slice(0, 2), hash.slice(2, 4));
}
// When a folder changes, first open() the folder, and then rebuild the indexes of all indexed ancestors. This "rebuild" step never needs to go deeper than the folder's own contents.
function open(filename, dirname) {
	if("/" === filename[filename.length - 1]) filename = filename.slice(0, -1);
	var stream = new ReadWriteStream();
	var fullname = pathModule.join(dirname, filename);
	if(!dirname) {
		dirname = pathModule.dirname(fullname);
		filename = pathModule.basename(fullname);
	}
	fs.readdir(fullname, function(err, files) {
		if(!err) { // Directory
			var hash = getHash(fullname);
			var hashDir = getHashDirPath(hash);
			mkdirRecursive(hashDir, function(err) {
				if(err) return stream.emit("error", err);
				var gzip, index;
				(function openFile(i) {
					if(i >= files.length) {
						if(!gzip) return stream.end();
						gzip.end("", function() {
							stream.write("../\n");
							stream.end();
						});
					} else {
						var substream = open(files[i], fullname);
						substream.on("data", function(chunk) {
							if(!index && chunk && chunk.length) {
								stream.write(filename+"/\n");
								gzip = zlib.createGzip();
								fs.writeFile(hashDir+"/"+hash+"-path", fullname, "utf8");
								index = fs.createWriteStream(hashDir+"/"+hash+"-index.gz");
								stream.pipe(gzip).pipe(index);
								sentDirEntry = true;
							}
							stream.write(chunk);
						});
						substream.on("end", function() {
							openFile(i + 1);
						});
					}
				})(0);
			});
		} else if("ENOTDIR" === err.code) { // File
			fs.open(fullname, "r", function(err, fd) { // TODO: At some point in here we should check if a thumbnail already exists, and if so, if its newer than the image. If so we can skip all the other checks.
				if(err) return stream.emit("error", err);
				var fourcc = new Buffer(4);
				fs.read(fd, fourcc, 0, fourcc.length, 0, function(err, length) {
					if(err) return stream.emit("error", err);
					fs.close(fd);
					if(length !== fourcc.length || !fourccs.hasOwnProperty(fourcc.readUInt32BE(0))) return stream.end();
					mkdirRecursive(CACHE+dirname, function(err) {
						if(err) return stream.emit("error", err);
						var thumbname = fullname;
						var ext = pathModule.extname(fullname);
						if(ext) thumbname = thumbname.slice(0, -ext.length);
						var thumbnail = proc.spawn("convert", ["-size", "128x128", fullname, "-coalesce", "-thumbnail", "128x128", "-quality", "50", CACHE+thumbname+"-thumb.jpg"]);
						thumbnail.on("error", function(err) {
							stream.emit("error", err);
						});
						thumbnail.on("exit", function(code, signal) {
							if(code) return stream.end();
							var hash = getHash(fullname);
							var hashDir = getHashDirPath(hash);
							fs.writeFile(hashDir+"/"+hash+"-path", fullname, "utf8");
							stream.write(filename+"\n");
							stream.end();
						});
					});
				});
			});
		} else { // Read error
			stream.emit("error", err);
		}
	});
	return stream;
}


function exec(exp, str, func/* (cap1, cap2, etc) */) {
	var val = exp.exec(str);
	if(!val) return false;
	val = Array.prototype.slice.call(val, 1);
	func.apply(this, val);
	return true;
}
function contentType(path) {
	var type = mime[pathModule.extname(path).slice(1).toLowerCase()] || "application/octet-stream";
	if("text/" === type.slice(0, 5)) type += "; charset=utf-8";
	return type;
}
http.createServer(function(req, res) {
	function sendfile(path, type, compression, errback/* (err) */) {
		var stream = fs.createReadStream(path), head = false;
		stream.on("data", function(chunk) {
			if(!head) {
				if("none" !== compression) res.setHeader("content-encoding", compression);
				res.writeHead(200, {"content-type": type});
				head = true;
			}
			res.write(chunk);
		});
		stream.on("end", function() {
			res.end();
		});
		stream.on("error", function(err) {
			errback(err);
		});
	}
	function senderr(err) {
		if("ENOENT" === err.code) {
			res.writeHead(404, {"content-type": "text/plain; charset=utf-8"});
			res.end("File not found", "utf8");
			console.log("404", err.path);
		} else {
			res.writeHead(500, {"content-type": "text/plain; charset=utf-8"})
			res.end("Internal server error", "utf8");
			console.log(err);
		}
	}
	function sendfiles(opt1, opt2, etc) {
		var opts = arguments;
		sendfile.apply(this, opt1.concat([function(err) {
			if(opts.length > 1) sendfiles.apply(this, Array.prototype.slice.call(opts, 1));
			else senderr(err);
		}]));
	}
	var path = unescape(decodeURI(url.parse(req.url).pathname)) || "/";
	exec(/^\/([a-zA-Z0-9\-_]{11})/, path, function(hash) {
		// TODO: We're serving the regular gallery index to all hashes, even if they're invalid. Validate client-side.
		var htmlPath = __dirname+"/../client/gallery/index.html";
		var type = "text/html; charset=utf-8";
		sendfiles(
			[htmlPath+".gz", type, "gzip"],
			[htmlPath, type, "none"]
		);
	}) ||
	exec(/^\/index\/([a-zA-Z0-9\-_]{11})\/$/, path, function(hash) {
		sendfiles(
			[getHashDirPath(hash)+"/"+hash+"-index.gz", "text/plain; charset=utf-8", "gzip"]
		);
	}) ||
	exec(/^\/image\/([a-zA-Z0-9\-_]{11})(\/.+)$/, path, function(hash, imagePath) {
		/* WARNING: Insecure! Even non-image files are available! */
		/* Also, we already checked the file's FourCC, why are we getting its MIME type from the path now? */
		fs.readFile(getHashDirPath(hash)+"/"+hash+"-path", "utf8", function(err, root) {
			if(err) return senderr(err);
			sendfiles(
				[root+pathModule.normalize(imagePath), contentType(imagePath), "none"]
			);
		});
	}) ||
	exec(/^\/thumb\/([a-zA-Z0-9\-_]{11})(\/.+)$/, path, function(hash, imagePath) {
		fs.readFile(getHashDirPath(hash)+"/"+hash+"-path", "utf8", function(err, root) {
			if(err) return senderr(err);
			var thumbname = pathModule.normalize(imagePath);
			var ext = pathModule.extname(thumbname);
			if(ext) thumbname = thumbname.slice(0, -ext.length);
			sendfiles(
				[CACHE+root+thumbname+"-thumb.jpg", contentType(imagePath), "none"]
			);
		});
	}) ||
	(function() {
		if("/" === path[path.length - 1]) path += "index.html";
		path = __dirname+"/../client"+pathModule.normalize(path);
		var mime = contentType(path);
		sendfiles(
			[path+".gz", mime, "gzip"],
			[path, mime, "none"]
		);
	})();
}).listen(8001, null);
