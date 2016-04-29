/**
 * Implementation of pattern Mediator - all modules are connected through this hub by means of events
 * Every event can have predefined order of listeners call
 * Order of listeners call is defined by two objects:
 * _listenerTypes - {name: constructor, ...}
 * _listenerTypesCallOrder - {event_name: [name1, name2, name3, ...], ...}
 * @constructor
 */
YOVALUE.Mediator = function (listenerTypes, listenerTypesCallOrder) {
  this._listenerTypes = YOVALUE.clone(listenerTypes) || {'undefined':null};
  this._listenerTypesCallOrder = listenerTypesCallOrder || [];
  this._listeners = {};
};

YOVALUE.Mediator.prototype = {

  /**
   * Subscribe modules to event in a given order
   * @param subscriptions - {event_name: [module1, module2, module3, ...], ...}
   */
  setSubscriptions: function(subscriptions){
    var eventName, j, listeners;

    //sanity check
    for(eventName in subscriptions){
      listeners = subscriptions[eventName];
      for(j in listeners){
        if (!(YOVALUE.implements(listeners[j], YOVALUE.iListener))) {
          console.log('listener', listeners[j], 'do not has YOVALUE.iListener interface');
          YOVALUE.errorHandler.throwError("listener do not has YOVALUE.iListener interface");
        }
      }
    }

    this._listeners = subscriptions;
  },

  /**
   * Get all subscribers that are subscribed on event with name event_name
   * and of type subscriber_type (i.e. subscriber constructor = this._subscriberTypes[subscriber_type])
   * @param event_name
   * @return {*}
   */
  getListeners: function (event_name) {
    if (!this._listeners[event_name]) {
      this._listeners[event_name] = [];
    }
    return this._listeners[event_name];
  },

  /**
   * Add listener that implements iListener as an eventName listener
   * @param eventName
   * @param listener
   */
  addListener: function (eventName, listener) {
    var listenerType = this._getListenerType(listener), i;

    if(!YOVALUE.implements(listener, YOVALUE.iListener)) {
      YOVALUE.errorHandler.throwError('Object do not implement YOVALUE.iListener interface');
    }

    //if order of listener calling does not matter, just add listener to the end of the list
    var listeners = this.getListeners(eventName);
    if(listenerType === 'undefined' || this._listenerTypesCallOrder[eventName].indexOf(listenerType) === -1 || listeners.length === 0){
      listeners.push(listener);
    }
    //else we have predefined order for this listener - respect it
    else{
      var l = listeners.length;
      for(i=0; i<l; i=i+1){
        if(
          this._listenerTypesCallOrder[eventName].indexOf(this._getListenerType(listeners[i])) >=
          this._listenerTypesCallOrder[eventName].indexOf(listenerType)
        ){
          listeners.splice(i, 0, listener);
          return;
        }
      }
      //all listeners have order less than this, so insert it at the very end of list
      listeners.push(listener);
    }
  },

  removeListener: function(eventName, subscriber){

  },

  hasListener: function(eventName, subscriber){
    var subscribers = this.getListeners(eventName);

    for (var i = 0, l = subscribers.length; i < l; i++) {
      if (subscribers[i] == subscriber) {
        return true;
      }
    }

    return false;
  },

  /**
   * This function try determine listener type (= module constructor name)
   * according known constructors in this._listenerTypes
   * If listener type are in the this._listenerTypes list it returns its name
   * otherwise it returns 'undefined'
   * @param listener
   * @private
   */
  _getListenerType: function(listener){
    var type;
    for(type in this._listenerTypes){
      if(typeof(this._listenerTypes[type]) == 'function' && listener instanceof this._listenerTypes[type]) return type;
    }
    return "undefined";
  },

  /**
   * Dispatches an event to all registered listeners.
   * If order of listeners calling is given - respect it
   * @param event
   */
  dispatch: function (event) {
    //sanity check
    if (!(YOVALUE.implements(event, YOVALUE.iEvent))) {
      YOVALUE.errorHandler.throwError("event do not implement YOVALUE.iEvent");
    }

    var listeners = this.getListeners(event.getName());

    // for debugging: get info about event publisher and listeners
    if(DEBUG_MODE){
      var stack = printStackTrace();
      for(i = 0; i < stack.length; i++){
        if(stack[i].indexOf("Publisher.js") > 0 && stack[i+1].indexOf("Publisher.js") < 0) break;
      }
      var str = stack[i+1];
      // str decoration
      var src = str.substr(str.lastIndexOf("/"));
      var fileName = src.substr(1,src.indexOf(":")-1);
      var codeLine = src.substr(src.indexOf(":")+1);
      if(codeLine[codeLine.length-1] == ')') codeLine = codeLine.substr(0,codeLine.length-1);
      // log it
      YOVALUE.debug.print(fileName,codeLine,'fire',event.getName(),event.getData(), YOVALUE.getObjectId(event));
      //YOVALUE.logger.log(str.substr(str.lastIndexOf("/"))+" ---- "+event.getName(), YOVALUE.clone(event.getData()), YOVALUE.getObjectId(event));
    }
    // endof debugging

    for (var i = 0, l = listeners.length; i < l; i++) {
      try {

        // for debugging
        if(DEBUG_MODE){
          YOVALUE.debug.print(listeners[i].moduleName,'','receive',event.getName(),event.getData(), YOVALUE.getObjectId(event));
        }
        // endof debugging

        listeners[i].eventListener(event);
      } catch (e) {}
    }
  }
};