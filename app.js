const Ngml2json = require('./ngml2json');
const Json2gml = require('./json2gml');
const Gml2gmx = require('./gml2gmx');
const NGMLError = require('./NGMLError');

const fs = require("fs");

try {
  var parser = new Ngml2json(fs.readFileSync("test.ngml").toString(), "test.ngml");
  console.log(JSON.stringify(parser.scopeTop()));
} catch (e) {
  if (e instanceof NGMLError) {
    //console.error("NGML Error in ", e.fileName, e.message, " in line ", e.lineNumber);
    console.error(e.toString());
  } else {
    throw e;
  }
}