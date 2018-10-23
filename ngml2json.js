const NGMLError = require("./NGMLError.js");

const allowedClassOptions = [
  "invisible", "persistent", "solid", "physical"
];

const numberChars = "0123456789";
const hexChars = "0123456789abcdefABCDEF";
const binaryChars = "01";
const ignoreChars = " \n\t\r";
const operators = ":+-*{}()[],./\\;=#?|<>^$";
const allowedNameStart = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
const allowedCharsInName = allowedNameStart + numberChars;

const allowedCharsInSymbol = allowedNameStart + ignoreChars + operators + numberChars + "\"'";

function testLiteral(value, file, line) {
  if(value.startsWith("0b")) {
    for(var i = 2; i < value.length; i++) {
      if(!binaryChars.includes(value[i])) {
        throw new NGMLError("Malformed binary literal", file, line);
      }
    }
  } else if(value.startsWith("0x")) {
    for(var i = 2; i < value.length; i++) {
      if(!hexChars.includes(value[i])) {
        throw new NGMLError("Malformed hexadecimal literal", file, line);
      }
    }
  } else if(numberChars.includes(value[0])) {
    for(var i = 1; i < value.length; i++) {
      if(!numberChars.includes(value[i])) {
        throw new NGMLError("Malformed decimal literal", file, line);
      }
    }
  } else if(value[0] == "\"") {
    if(value[value.length - 1] != "\"") {
      throw new NGMLError("Unexpected end of string", file, line);
    }
  } else if(value[0] == "'") {
    if(value[value.length - 1] != "'") {
      throw new NGMLError("Unexpected end of string", file, line);
    }
  } else {
    throw new NGMLError("WTF, How did you manage to malform this value!?", file, line);
  }
}

function megaSuperDuperMasterSplit(text) {
  var output = [];
  var lines = [];
  var line = 1;
  

  var index = 0;

  var stringChar = "";
  var word = "";
    
  while(index < text.length) {
    var char = text.charAt(index);
    index++;

    if (ignoreChars.includes(char)) {
      if(char == "\n") {
        line++;        
      }
      lines.push(line);            
      output.push(word);      
      word = "";
      continue;
    }

    if(char == "/" && (text.charAt(index) == "/" || text.charAt(index) == "*")) {
      var charlast = char;
      char = text.charAt(index);
      index++;
      if(char == "/") {
        while(index < text.length) {
          char = text.charAt(index);
          index++;
          if(char == "\n") {
            break;
          }
        }
      } else {
        while(index < text.length) {
          charlast = char;
          char = text.charAt(index);
          index++;
          if(charlast == "*" && char == "/") {
            break;
          }
        }
      }
    } else if(char == "\"") {
      lines.push(line);
      word += char;
      stringChar = "\"";
      while(index < text.length) {
        char = text.charAt(index);
        index++;
        if(char == "\n") {
          line++;
        }

        word += char;
        if(char == stringChar) {
          if(text.charAt(index-2) != "\\"){
            output.push(word);
            word = "";
            break;
          }
        }
      }
    } else if(char == "'") {
      lines.push(line);
      word += char;
      stringChar = "'";
      while(index < text.length) {
        char = text.charAt(index);
        index++;
        if(char == "\n") {
          line++;
        }

        word += char;
        if(char == stringChar) {
          if(text.charAt(index-2) != "\\"){
            output.push(word);
            word = "";
            break;
          }
        }
      }
    } else {
      if (operators.includes(char)) { 
        if (word != "") {
          output.push(word);
          lines.push(line);          
        }        
        output.push(char);
        lines.push(line);
        word = "";
      } else {
        word += char;
      }
    }

  }
  
  output.push(word);
  lines.push(line);

  var outnew = [];
  var linew = [];

  for (var i = 0; i < output.length; i++) {
    if(!output[i] == "") {
      outnew.push(output[i]);
      linew.push(lines[i]);
    }        
  }

  return {
    symbols: outnew,
    lines: linew
  };

}

function symbolTester(symbols, lines, file) {
  for (var i = 0; i < symbols.length; i++) {
    for(var j = 0; j < symbols[i].length; j++)

    if(!allowedCharsInSymbol.includes(symbols[i][j])) {
      //error char: symbols[i][j]  symbol: symbols[i]   lines[i]
      throw new NGMLError("Syntax Error: Illegal char " + symbols[i][j] + " in symbol " + symbols[i], file, lines[i]);
    }
  }
}

class Ngml2json {

  constructor(ngml, file) {
    this.index = 0;
    this.text = ngml;
    var splitted = megaSuperDuperMasterSplit(this.text);
    this.symbols = splitted.symbols;
    this.lines = splitted.lines;
    this.file = file;

    symbolTester(this.symbols, this.lines, this.file);

    console.log("----")
    for (let i = 0; i < this.symbols.length; i++) {
      var symbol = this.symbols[i];
      var line = this.lines[i];
      console.log(line + " " + symbol);
    }
    console.log("----")
  }

  scopeTop() {

    var output = [];

    while (this.index < this.symbols.length) {
      var symbol = this.symbols[this.index];
      this.index++;

      if (symbol == "class") {
        output.push(this.scopeClass());
      } else if (symbol == "function") {

      } else {
        throw new NGMLError(`Unexpected Symbol "${symbol}"`, this.file, this.lines[this.index - 1]);
      }
    }

    return output;
  }

  scopeClass() {
    var symbol;
    var options = [];
    var methods = [];
    var events = [];
    var attributes = [];
    var name = "";
    var parent = "";
    symbol = this.symbols[this.index];
    this.index++;

    while (symbol != "{") {
      options.push(symbol);
      symbol = this.symbols[this.index];
      this.index++;
    }

    if (options.includes(":")) {
      if (options[options.length - 2] != ":" || options.filter(s => s == ":").length != 1) throw new Error("Malformed parent assign", this.file, this.lines[this.index - 1]);
      parent = options.pop();
      options.pop();
      name = options.pop();
    } else {
      name = options.pop();
    }

    if (!allowedNameStart.includes(name[0])) {
      throw new NGMLError("Class names are not allowed to start with a number " + name, this.file, this.lines[this.index - 1]);
    }

    for (var i = 0; i < options.length; i++) {
      if (!allowedClassOptions.includes(options[i])) {
        throw new NGMLError("Unkown Class option " + options[i], this.file, this.lines[this.index - 1]);
      }
    }

    symbol = this.symbols[this.index];
    this.index ++;
    while (symbol != "}") {
      if (symbol == "var") {
        attributes.push(this.scopeAttribute());
      } else if (symbol == "method") {

      } else if (symbol == "event") {
        events.push(this.scopeEvent());
      } else if (symbol == name) {

      } else {
        throw new NGMLError("Unkown Class Element " + symbol, this.file, this.lines[i]);
      }

      symbol = this.symbols[this.index];
      this.index++;
    }

    return {
      name: name,
      parent: parent,
      attributes: attributes,
      events: events,
      methods: methods,
      options: options
    };
  }

  scopeAttribute() {
    var symbol = this.symbols[this.index];
    this.index++;
    var name = symbol;

    if (!allowedNameStart.includes(name[0])) {
      throw new NGMLError("Attributes are not allowed to start with a number " + name, this.file, this.lines[this.index - 1]);
    }
    
    for(var i = 1; i < name.length; i++) {
      if(!allowedCharsInName.includes(name[i])) {
        throw new NGMLError("Illegal char in attribute name" + name, this.file, this.lines[this.index - 1]);
      }
    }

    var symbol = this.symbols[this.index];
    this.index++;

    if (symbol == "=") {
      var symbol = this.symbols[this.index];
      this.index++;
      var value = symbol;

      testLiteral(value, this.file, this.lines[this.index - 1]); //will throw an error on error

      var symbol = this.symbols[this.index];
      this.index++;
      if (symbol != ";") {
        throw new NGMLError("Malformed attribute declaration", this.file, this.lines[this.index - 1]);
      }
      return {name: name, value: value};
    } else if (symbol == ";") {
      return {name: name, value: null};
    } else {
      throw new NGMLError("Malformed attribute declaration", this.file, this.lines[this.index - 1]);
    }
  }

  scopeEvent() {
    var symbol = this.symbols[this.index];
    this.index++;
    var name = symbol;
  }

}


module.exports = Ngml2json;