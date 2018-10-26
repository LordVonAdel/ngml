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

module.exports.NGMLError = NGMLError;
module.exports.ProjectError = ProjectError;