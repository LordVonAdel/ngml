const NGMLParser = require('./NGMLParser');
const NGMLProcessor = require('./NGMLProcessor');
const NGMLBuilder = require('./NGMLBuilder');
const {NGMLError, ProjectError, NGMLCodeError} = require('./NGMLError');

const fs = require("fs");
const path = require("path");

try {

  var parser = new NGMLParser();
  var collection = [];

  function scan(directory) {
    var dir = fs.readdirSync(directory);
    var files = [];
    dir.forEach((e) => {
      var pathname = path.join(directory, e);
      var stats = fs.statSync(pathname);
      if (stats.isDirectory()) {
        files.push(...scan(pathname));
      } else {
        var ext = path.extname(pathname);
        if (ext == ".ngml") {
          files.push(pathname);
        }
      }
    });
    return files;
  }

  var allfiles = scan("D:/Projekte/node/ngml");
  console.log("Found " + allfiles.length + " files."); 

  for (var i = 0; i < allfiles.length; i++) {
    var filename = allfiles[i];
    console.log("Reading file: " + filename);
    parser.read(filename);
  }
  parser.finalize();

  var processor = new NGMLProcessor();
  processor.process(parser.collection);

  console.log("Finished processing project!");
} catch (e) {
  if (e instanceof NGMLError) {
    console.error(e.toString());
  } else if (e instanceof ProjectError) {
    console.error(e.toString());
  } else if (e instanceof NGMLCodeError) {
    console.error(e.toString());
  } else {
    throw e;
  }
}