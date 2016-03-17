YOVALUE.iEvent = {
  getName: function(){},
  getData: function(){},
  setResponse: function(v){},
  getResponse: function(){}
};

/**
 * You can think of it as a deferred object which resolve is called on setResponse()
 * @param name
 * @param {Object=} data optional data of event
 * @param {Object=} deferred in a CommonJS Promises/A design (must implement method resolve)
 * @constructor
 */
YOVALUE.Event = function (name, data, deferred) {
  this._name = name;
  this._data = data;
  this._response = null;
  YOVALUE.mixin(deferred, this);
};

YOVALUE.Event.prototype = YOVALUE.extend(YOVALUE.iEvent, {
  getName: function(){
    return this._name;
  },
  getData: function(){
    return this._data;
  },
  setResponse: function(v){
    // for debugging
    if(DEBUG_MODE){
      var stack = printStackTrace();

      for(var i = 0; i < stack.length; i++){
          if(stack[i].indexOf("setResponse") > 0) break;
      }

      var str = stack[i+1];
      // str decoration
      var src = str.substr(str.lastIndexOf("/"));
      var fileName = src.substr(1,src.indexOf(":")-1);
      var codeLine = src.substr(src.indexOf(":")+1);
      if(codeLine[codeLine.length-1] == ')') codeLine = codeLine.substr(0,codeLine.length-1);
      // log it
      YOVALUE.debug.print(fileName,codeLine,'response',this.getName(), v, YOVALUE.getObjectId(this));
    }
    // endof debugging

    this._response = v;
    this.resolve(v);
  },
  getResponse: function(){
    return this._response;
  }
});

