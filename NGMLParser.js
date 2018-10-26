const {NGMLError, ProjectError} = require('./NGMLError');
const fs = require("fs");

const allowedClassOptions = [
  "invisible", "persistent", "solid", "physical"
];

const numberChars = "0123456789";
const hexChars = "0123456789abcdefABCDEF";
const binaryChars = "01";
const ignoreChars = " \n\t\r";
const operators = ":+-*{}()[],./\\;=#?|<>^$";
const allowedNameStart = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
const events = require("./events.json");

const allowedCharsInSymbol = allowedNameStart + ignoreChars + operators + numberChars + "\"'";

/*
function testLiteral(value, file, line) {
  if (value.startsWith("0b")) {
    for (var i = 2; i < value.length; i++) {
      if (!binaryChars.includes(value[i])) {
        throw new NGMLError("Malformed binary literal", file, line);
      }
    }
  } else if (value.startsWith("0x")) {
    for (var i = 2; i < value.length; i++) {
      if (!hexChars.includes(value[i])) {
        throw new NGMLError("Malformed hexadecimal literal", file, line);
      }
    }
  } else if (numberChars.includes(value[0])) {
    for (var i = 1; i < value.length; i++) {
      if (!numberChars.includes(value[i])) {
        throw new NGMLError("Malformed decimal literal", file, line);
      }
    }
  } else if (value[0] == "\"") {
    if (value[value.length - 1] != "\"") {
      throw new NGMLError("Unexpected end of string", file, line);
    }
  } else if (value[0] == "'") {
    if (value[value.length - 1] != "'") {
      throw new NGMLError("Unexpected end of string", file, line);
    }
  } else {
    throw new NGMLError("WTF, How did you manage to malform this value!?", file, line);
  }
}
*/

function megaSuperDuperMasterSplit(text) {
  var output = [];
  var lines = [];
  var line = 1;

  var index = 0;

  var stringChar = "";
  var word = "";

  while (index < text.length) {
    var char = text.charAt(index);
    index++;

    if (ignoreChars.includes(char)) {
      if (char == "\n") {
        line++;
      }
      lines.push(line);
      output.push(word);
      word = "";
      continue;
    }

    if (char == "/" && (text.charAt(index) == "/" || text.charAt(index) == "*")) {
      var charlast = char;
      char = text.charAt(index);
      index++;
      if (char == "/") {
        while (index < text.length) {
          char = text.charAt(index);
          index++;
          if (char == "\n") {
            line++;
            break;
          }
        }
      } else {
        while (index < text.length) {
          charlast = char;
          char = text.charAt(index);
          index++;
          if (char == "\n") {
            line++;
          }
          if (charlast == "*" && char == "/") {
            break;
          }
        }
      }
    } else if (char == "\"") {
      lines.push(line);
      word += char;
      stringChar = "\"";
      while (index < text.length) {
        char = text.charAt(index);
        index++;
        if (char == "\n") {
          line++;
        }

        word += char;
        if (char == stringChar) {
          if (text.charAt(index - 2) != "\\") {
            output.push(word);
            word = "";
            break;
          }
        }
      }
    } else if (char == "'") {
      lines.push(line);
      word += char;
      stringChar = "'";
      while (index < text.length) {
        char = text.charAt(index);
        index++;
        if (char == "\n") {
          line++;
        }

        word += char;
        if (char == stringChar) {
          if (text.charAt(index - 2) != "\\") {
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
    if (!output[i] == "") {
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
    for (var j = 0; j < symbols[i].length; j++)

      if (!allowedCharsInSymbol.includes(symbols[i][j])) {
        //error char: symbols[i][j]  symbol: symbols[i]   lines[i]
        throw new NGMLError("Syntax Error: Illegal char " + symbols[i][j] + " in symbol " + symbols[i], file, lines[i]);
      }
  }
}

class NGMLParser {

  constructor() {
    this.collection = [];
  }

  read(fileName) {
    this.file = fileName;
    this.text = fs.readFileSync(fileName).toString();

    var splitted = megaSuperDuperMasterSplit(this.text);
    this.symbols = splitted.symbols;
    this.lines = splitted.lines;

    this.line = this.lines[0];
    this.index = 0;

    symbolTester(this.symbols, this.lines, this.file);

    this.merge(this.scopeFile());
  }

  merge(elements) {
    for (var j = 0; j < elements.length; j++) {
      var outElement = elements[j];

      if (outElement.type == "class") {
        if (!this.collection.some((collectionElement) => (collectionElement.type == outElement.type && collectionElement.name == outElement.name))) { //does class not exists
          this.collection.push({type: "class", name: outElement.name, options: [], methods: [], events: [], attributes: [], constructors: [], parent: outElement.parent});
        }
        for (var k = 0; k < this.collection.length; k++) {
          var collectionElement = this.collection[k];

          if (collectionElement.type == "class" && collectionElement.name == outElement.name) { //is this the existing class

            if (outElement.parent != collectionElement.parent) {
              throw new ProjectError(`Different parents in multiple declarations of class ${outElement.name}`);
            }

            for (var l = 0; l < outElement.methods.length; l++) { //merge methods
              var methodToInsert = outElement.methods[l];
              if (collectionElement.methods.some((methodThatIsAlreadyThere) => (methodThatIsAlreadyThere.name == methodToInsert.name))) {
                throw new ProjectError(`Duplicate method "${methodToInsert.name}" found in class "${collectionElement.name}"`);
              }
              collectionElement.methods.push(methodToInsert);
            }

            for (var l = 0; l < outElement.events.length; l++) { //merge events
              var eventToInsert = outElement.events[l];
              if (collectionElement.events.some((eventThatIsAlreadyThere) => (eventThatIsAlreadyThere.name == eventToInsert.name))) {
                throw new ProjectError(`Duplicate event "${eventToInsert.name}" found in class "${collectionElement.name}"`);
              }
              collectionElement.events.push(eventToInsert);
            }

            for (var l = 0; l < outElement.attributes.length; l++) { //merge attributes
              var attributeToInsert = outElement.attributes[l];
              if (collectionElement.attributes.some((attributeThatIsAlreadyThere) => (attributeThatIsAlreadyThere.name == attributeToInsert.name))) {
                throw new ProjectError(`Duplicate attribute "${attributeToInsert.name}" found in class "${collectionElement.name}"`);
              }
              collectionElement.attributes.push(attributeToInsert);
            }

            for (var l = 0; l < outElement.options.length; l++) { //merge options
              var optionToInsert = outElement.options[l];
              if (!collectionElement.options.includes(optionToInsert)) {
                collectionElement.options.push(optionToInsert);
              }
            }

            for (var l = 0; l < outElement.constructors.length; l++) { //merge constructors
              var constructorToInsert = outElement.constructors[l];
              if (collectionElement.constructors.length > 0) {
                throw new ProjectError(`More than one constructor found in class "${collectionElement.name}" `);
              }
              collectionElement.constructors.push(constructorToInsert);
            }
            break;
          }
        }
      } else {
        if (this.collection.some((element) => (element.type == outElement.type && element.name == outElement.name))) {
          throw new ProjectError(`Duplicate declaration found of ${outElement.type}: "${outElement.name}"`);
        }
        this.collection.push(outElement);
      }
    }
  }

  finalize() {
    for (var i = 0; i < this.collection.length; i++) {
      var element = this.collection[i];

      if (element.type == "class") {
        parent = element.parent;
        parents = [element.name];
        while (parent != "") {
          for (var j = 0; j < this.collection.length; j++) {
            var checkElement = this.collection[j];
            if (checkElement.type == "class" &&  checkElement.parent == parent) {
              parents.push(parent);
              parent = checkElement.parent;
              if (parents.includes(parent)) {
                throw new ProjectError(`Recursive parents of class ${element.name}`);
              }
              continue;
            }
          }
          throw new ProjectError(`Parent "${parent}" does not exists of class "${element.name}"`);
        }
      }
    }
  }

  next() {
    this.index++;
    var symbol = this.symbols[this.index];

    if (!symbol) {
      throw new NGMLError("Unexpected end of file", this.file, this.lines[this.index - 1]);
    }

    this.line = this.lines[this.index];
    return symbol;
    
  }

  scopeFile() {
    var output = [];
    var symbol = this.symbols[this.index];

    while (this.index < this.symbols.length-1) {
      if (symbol == "class") {
        output.push(this.scopeClass());
      } else if (symbol == "function") {
        output.push(this.scopeFunction());
      } else if (symbol == "global") {
        output.push(this.scopeGlobal());
      } else {
        throw new NGMLError(`Unexpected Symbol "${symbol}"`, this.file, this.line);
      }
      if(this.index >= this.symbols.length-1) {
        break;
      }
      symbol = this.next();
    }

    return output;
  }

  scopeGlobal() {
    var vartype = null, value = [], name;

    var symbol = this.next();
    name = symbol;

    if (!allowedNameStart.includes(name[0])) {
      throw new NGMLError("Globals are not allowed to start with a number " + name, this.file, this.line);
    }

    symbol = this.next();

    if (symbol == ":") {
      symbol = this.next();
      vartype = symbol;
      symbol = this.next();
    }

    if (symbol == "=") {
      symbol = this.next();
      while (symbol != ";") {
        value.push(symbol);
        symbol = this.next();
      }
      if (value.length == 0) {
        throw new NGMLError("Missing value in assignment in global declaration", this.file, this.line);
      }
    } else if (symbol != ";") {
      throw new NGMLError("Malformed global declaration", this.file, this.line);
    }

    return {
      type: "global",
      name: name,
      value: value,
      vartype: vartype
    }
  }

  scopeClass() {
    var symbol;
    var options = [];
    var methods = [];
    var events = [];
    var attributes = [];
    var constructors = [];
    var name = "";
    var parent = "";

    symbol = this.next();

    while (symbol != "{") {
      options.push(symbol);
      symbol = this.next();
    }

    if (options.includes(":")) {
      if (options[options.length - 2] != ":" || options.filter(s => s == ":").length != 1) throw new Error("Malformed parent assign", this.file, this.line);
      parent = options.pop();
      options.pop();
      name = options.pop();
    } else {
      name = options.pop();
    }

    if (!allowedNameStart.includes(name[0])) {
      throw new NGMLError("Class names are not allowed to start with a number " + name, this.file, this.line);
    }

    for (var i = 0; i < options.length; i++) {
      if (!allowedClassOptions.includes(options[i])) {
        throw new NGMLError("Unkown Class option " + options[i], this.file, this.line);
      }
    }

    symbol = this.next();
    while (symbol != "}") {
      if (symbol == "var") {
        var attribute = this.scopeAttribute();
        attributes.push(attribute);
      } else if (symbol == "method") {
        var method = this.scopeMethod();
        methods.push(method);
      } else if (symbol == "event") {
        var event = this.scopeEvent();
        events.push(event);
      } else if (symbol == name) {
        var constructor = this.scopeConstructor();
        constructors.push(constructor);
      } else {
        throw new NGMLError("Unkown Class Element " + symbol, this.file, this.line);
      }

      symbol = this.next();
    }

    return {
      type: "class",
      name: name,
      parent: parent,
      attributes: attributes,
      constructors: constructors,
      events: events,
      methods: methods,
      options: options
    };
  }

  scopeAttribute() {
    var vartype = null, value = [], name;

    var symbol = this.next();
    name = symbol;

    if (!allowedNameStart.includes(name[0])) {
      throw new NGMLError("Attributes are not allowed to start with a number " + name, this.file, this.line);
    }

    symbol = this.next();

    if (symbol == ":") {
      symbol = this.next();
      vartype = symbol;
      symbol = this.next();
    }

    if (symbol == "=") {
      symbol = this.next();
      while (symbol != ";") {
        value.push(symbol);

        symbol = this.next();
      }
      if (value.length == 0) {
        throw new NGMLError("Missing value in assignment in attribute declaration", this.file, this.line);
      }
    } else if (symbol != ";") {
      throw new NGMLError("Malformed attribute declaration", this.file, this.line);
    }

    return {
      name: name,
      value: value,
      vartype: vartype
    }
  }

  scopeEvent() {
    var symbol = this.next();
    var name = symbol;
    var event = events[name];
    if (!event) {
      throw new NGMLError(`Unkown event type: ${name}`, this.file, this.line);
    }

    symbol = this.next();
    if (symbol != "{") {
      throw new NGMLError(`Malformed event declaration`, this.file, this.line);
    }
    var numBrackets = 1; //include first bracket from head
    var code = [];
    var codeline = [];

    while (numBrackets > 0) {
      symbol = this.next();

      if (symbol == "{") {
        numBrackets++;
      } else if (symbol == "}") {
        numBrackets--;
      }
      code.push(symbol);
      codeline.push(this.line);
    }

    code.pop(); //remove last bracket
    codeline.pop();

    return {
      type: "event",
      name: name,
      eventNumber: event.number,
      eventType: event.type,
      code: code,
      codeline: codeline
    }
  }

  scopeMethod() {
    var symbol = this.next();
    var name = symbol;

    if (!allowedNameStart.includes(name[0])) {
      throw new NGMLError(`Invalid method name "${argument}"`, this.file, this.line);
    }

    symbol = this.next();
    if (symbol != "(") {
      throw new NGMLError(`Malformed method declaration`, this.file, this.line);
    }
    symbol = this.next();

    var args = [];
    if (symbol != ")") {
      
      while (true) {
        let argumenttype, argument;
        argument = symbol;

        if (!allowedNameStart.includes(argument[0])) {
          throw new NGMLError(`Invalid argument name "${argument}"`, this.file, this.line);
        }

        symbol = this.next();

        if(symbol == ":") {
          symbol = this.next();
          argumenttype = symbol;
          symbol = this.next();
        }

        if (args.some((arg) => arg.argumentname == argument)) {
          throw new NGMLError(`Duplicated argument name: "${argument}"`, this.file, this.line);
        }
        args.push({argumentname: argument, argumenttype: argumenttype});

        if (symbol == ",") {
          symbol = this.next();
        } else if (symbol == ")") {
          break;
        } else {
          throw new NGMLError("Malformed method head", this.file, this.line);
        }
      }
    }
    symbol = this.next();

    var returntype;
    if(symbol == ":") {
      symbol = this.next();
      returntype = symbol;
      symbol = this.next();
    }

    if (symbol != "{") {
      throw new NGMLError("Malformed method head", this.file, this.line);
    }

    var numBrackets = 1; //include first bracket from head
    var code = [];
    var codeline = [];

    while (numBrackets > 0) {
      symbol = this.next();

      if (symbol == "{") {
        numBrackets++;
      } else if (symbol == "}") {
        numBrackets--;
      }
      code.push(symbol);
      codeline.push(this.line);
    }

    code.pop(); //remove last bracket
    codeline.pop();

    return {
      type: "method",
      name: name,
      code: code,
      codeline: codeline,
      arguments: args,
      returntype: returntype
    }
  }

  scopeFunction() {
    var symbol = this.next();
    var name = symbol;

    if (!allowedNameStart.includes(name[0])) {
      throw new NGMLError(`Invalid function name "${argument}"`, this.file, this.line);
    }

    symbol = this.next();
    if (symbol != "(") {
      throw new NGMLError(`Malformed function declaration`, this.file, this.line);
    }
    symbol = this.next();

    var args = [];
    if (symbol != ")") {
      
      while (true) {
        let argumenttype, argument;
        argument = symbol;

        if (!allowedNameStart.includes(argument[0])) {
          throw new NGMLError(`Invalid argument name "${argument}"`, this.file, this.line);
        }

        symbol = this.next();

        if(symbol == ":") {
          symbol = this.next();
          argumenttype = symbol;
          symbol = this.next();
        }

        if (args.some((arg) => arg.argumentname == argument)) {
          throw new NGMLError(`Duplicated argument name: "${argument}"`, this.file, this.line);
        }
        args.push({argumentname: argument, argumenttype: argumenttype});

        if (symbol == ",") {
          symbol = this.next();
        } else if (symbol == ")") {
          break;
        } else {
          throw new NGMLError("Malformed function head", this.file, this.line);
        }
      }
    }
    symbol = this.next();

    var returntype;
    if(symbol == ":") {
      symbol = this.next();
      returntype = symbol;
      symbol = this.next();
    }

    if (symbol != "{") {
      throw new NGMLError("Malformed function head", this.file, this.line);
    }

    var numBrackets = 1; //include first bracket from head
    var code = [];
    var codeline = [];

    while (numBrackets > 0) {
      symbol = this.next();

      if (symbol == "{") {
        numBrackets++;
      } else if (symbol == "}") {
        numBrackets--;
      }
      code.push(symbol);
      codeline.push(this.line);
    }

    code.pop(); //remove last bracket
    codeline.pop();

    return {
      type: "function",
      name: name,
      code: code,
      codeline: codeline,
      arguments: args,
      returntype: returntype
    }
  }

  scopeConstructor() {
    var symbol = this.next();
    if (symbol != "(") {
      throw new NGMLError(`Malformed constructor declaration`, this.file, this.line);
    }
    symbol = this.next();

    var args = [];
    if (symbol != ")") {
      
      while (true) {
        let argumenttype, argument;
        argument = symbol;

        if (!allowedNameStart.includes(argument[0])) {
          throw new NGMLError(`Invalid argument name "${argument}"`, this.file, this.line);
        }

        symbol = this.next();

        if(symbol == ":") {
          symbol = this.next();
          argumenttype = symbol;
          symbol = this.next();
        }

        if (args.some((arg) => arg.argumentname == argument)) {
          throw new NGMLError(`Duplicated argument name: "${argument}"`, this.file, this.line);
        }
        args.push({argumentname: argument, argumenttype: argumenttype});

        if (symbol == ",") {
          symbol = this.next();
        } else if (symbol == ")") {
          break;
        } else {
          throw new NGMLError("Malformed constructor head", this.file, this.line);
        }
      }
    }
    symbol = this.next();

    if (symbol != "{") {
      throw new NGMLError("Malformed constructor head", this.file, this.line);
    }

    var numBrackets = 1; //include first bracket from head
    var code = [];
    var codeline = [];

    while (numBrackets > 0) {
      symbol = this.next();

      if (symbol == "{") {
        numBrackets++;
      } else if (symbol == "}") {
        numBrackets--;
      }
      code.push(symbol);
      codeline.push(this.line);
    }

    code.pop(); //remove last bracket
    codeline.pop();

    return {
      type: "constructor",
      code: code,
      codeline: codeline,
      arguments: args
    }
  }
}

module.exports = NGMLParser;