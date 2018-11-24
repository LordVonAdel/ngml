class NGMLError extends Error {

  constructor(message, file, line) {
    super(message, file, line);
    this.msg = message;
    this.fil = file;
    this.lne = line;
  }

  toString() {
    return "NGML Error: " + this.msg + " in line " + this.lne + " in file " + this.fil;
  }

}

class ProjectError extends Error {
  constructor(message) {
    super(message);
    this.msg = message;
  }

  toString() {
    return "Project Error: " + this.msg;
  }
}

class NGMLCodeError extends Error {
  constructor(message, line, location = null) {
    super(message);
    this.msg = message;
    this.line = line;
    this.location = location;
  }

  toString() {
    return "NGML Code Error: " + this.msg + " in line " + this.line + ((this.location != null) ? (" at " + this.location) : "");
  }
}

module.exports.NGMLError = NGMLError;
module.exports.ProjectError = ProjectError;
module.exports.NGMLCodeError = NGMLCodeError;