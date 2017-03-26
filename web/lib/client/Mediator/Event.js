GRASP.iEvent = {
  getName: function(){},
  getData: function(){},
  setResponse: function(v){},
  getResponse: function(){}
};

/**
 * You can think of it as a promise object which is resolved after call of setResponse() method
 * @param name
 * @param {Object=} data optional data of event
 * @param {Object=} deferred (must implement method resolve)
 * @constructor
 */
GRASP.Event = function (name, data, deferred) {
  this._name = name;
  this._data = data;
  this._response = null;
  this._isResolved = false;
  GRASP.mixin(deferred, this);
};

GRASP.Event.prototype = GRASP.extend(GRASP.iEvent, {
  getName: function(){
    return this._name;
  },
  getData: function(){
    return this._data;
  },
  setResponse: function(v){
    if(this._isResolved === true) return;

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
      GRASP.debug.printEvent(undefined,fileName,codeLine,'response',this.getName(), v, GRASP.getObjectId(this));
    }
    // endof debugging

    this._response = v;
    this._isResolved = true;
    this.resolve(v);
  },

  getResponse: function(){
    return this._response;
  },

  isResolved: function(){
    return this._isResolved;
  }
});

