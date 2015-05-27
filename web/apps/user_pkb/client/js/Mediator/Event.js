YOVALUE.iEvent = {
  getName: function(){},
  getData: function(){},
  setResponse: function(v){},
  getResponse: function(){}
};

/**
 *
 * @param name
 * @param {Object=} data optional data of event
 * @param {Object=} deferred in a CommonJS Promises/A design (must implement method resolve)
 * @constructor
 */
YOVALUE.Event = function (name, data, deferred) {
  this._name = name;
  this._data = data;
  this._response;
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
        if(stack[i].indexOf("YOVALUE.extend.setResponse") > 0) break;
      }
      var str = stack[i+1];
      console.log(" <--- " + this.getName() + "(Response) ---- " + str.substr(str.lastIndexOf("/")));
    }
    // endof debugging

    this._response = v;
    this.resolve(v);
  },
  getResponse: function(){
    return this._response;
  }
});

