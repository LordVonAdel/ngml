const {NGMLError, NGMLCodeError, ProjectError} = require('./NGMLError');

const __donotoverride_instantiate = { 
  name: "__donotoverride_instantiate",
  code: "for(var i=1;i<argument_count;i++){global.__donotoverride_params[i-1]=argument[i];}return instance_create(object,0,0);}"
}

class NGMLProcessor {

  constructor() {
    this.scripts = [__donotoverride_instantiate];
    this.rooms = [];
    this.objects = [];
    
    this.listScripts = [];
    this.listRooms = [];
    this.listObjects = [];
    this.listGlobals = [];
  }
  
  process(data) {

    for (var i = 0; i < data.length; i++) {
      if (data[i].type == "function") {
        this.listScripts.push(data[i].name);
      } else if (data[i].type == "global") {
        this.listGlobals.push(data[i].name);
      } else if (data[i].type == "class") {
        this.listObjects.push(data[i].name);
      }
    }

    for (var i = 0; i < data.length; i++) {
      if (data[i].type == "function") {
        this.processFunction(data[i]);
      } else if (data[i].type == "global") {

      } else if (data[i].type == "class") {
        this.processClass(data[i]);
      }
    }
  }

  processClass(data) {
    //console.log("Data is ", data);
  }

  processFunction(data) {
    var name = data.name;
    var code = this.code(data.code, data.codeline);
    
    for (var i = 0; i < data.arguments.length; i++) {
      code = "var " + data.arguments[i].argumentname + " = " + "argument[" + i + "]; " + code
    }

    this.scripts.push({
      name, code
    });
  }

  code(code, codeline) {
    var newcode = "";

    var symbol = "";
    var index = -1;
    
    function next() {
      index++;
      if (index >= code.length) throw new NGMLError("Unended Script", "", codeline[index - 1]);
      return code[index];
    }

    var blubCode = (function(symbol) {
      if(symbol == "new") {
        var classname = next();
        if (!this.listObjects.includes(classname)) throw new NGMLError(`Unknown class: "${classname}"`, "", codeline[index]);
        processNew(classname);
      } else if (symbol == ".") {
        processPeriod();
      } else {
        addSymbol(symbol);
      }
      
    }).bind(this);

    function addSymbol(symbol) {
      newcode += symbol + " ";
    }

    function processNew(classname) {
      newcode += "__donotoverride_instantiate(" + classname + ",";

      symbol = next();
      if(symbol != "(") {
        throw new NGMLError(`Malformed constructor for "${classname}"`, "", codeline[index]);
      }

      while((symbol = next()) != ")") {
        blubCode(symbol);
      }
      
      addSymbol(")");
      if(newcode[newcode.length-3] == ",") {
        newcode = newcode.substr(0, newcode.length - 3) + newcode[newcode.length - 2] + newcode[newcode.length - 1];
      }
    }

    function processPeriod() {
      if (index == 1) throw new NGMLCodeError("Code cant start with . operator", codeline[index]);
      var sender = code[index - 1]; //ToDo: Bug: Takes last symbol and not expression!(dont know how to fix)

      var name = next();

      newcode = newcode.substr(0, newcode.length - 2 - sender.length);

      var operatorAfterTheWordThere = next();
      if (operatorAfterTheWordThere == "(") { // function

        if(sender == ")") throw new NGMLCodeError(`Method on return of other method is not allowed yet. Method: "${name}"`, codeline[index]);
        // var aaa = new OB();
        // kuchen = aaa.hi(1, 2, 3); => script_execute(aaa.__donotoverride_method_hi, aaa, 1, 2, 3)
        // blablabla aaa sdf
        
        newcode += "script_execute(" + sender + ".__donotoverride_method_" + name + ", " + sender + ",";
          
        while((symbol = next()) != ")") {
          blubCode(symbol);
        }
        addSymbol(")");
        if(newcode[newcode.length-3] == ",") {
          newcode = newcode.substr(0, newcode.length - 3) + newcode[newcode.length - 2] + newcode[newcode.length - 1];
        }
        
      } else {
        addSymbol(sender + "." + name);
        addSymbol(operatorAfterTheWordThere);
      }
    }

    while(index < code.length-1) {
      blubCode(next());
    }

    return newcode;
  }



}

module.exports = NGMLProcessor;