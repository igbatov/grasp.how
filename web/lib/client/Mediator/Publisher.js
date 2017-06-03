/**
 *
 * @param mediator
 * @param promise must have interface
 * {
 *  getDefer:function,  // create new defer (like jQuery.Deferred). Defer should implement resolve() and then()
 *  when:function,      // schedule callback on defer resolve() (like jQuery.when)
 *  then:function       // schedule callback on next defer (like jQuery.then)
 * }
 *
 * @constructor
 */
GRASP.Publisher = function(mediator, promise){
  this._mediator = mediator;
  this._promise = promise;
  // track all events in this array
  this._allEvents = [];
};

GRASP.Publisher.prototype = {
  /**
   *
   * @param name
   * @param {Object=} data
   * @param {boolean=} resolveImmediately - if true promise is resolved after creation
   * @returns {GRASP.Event}
   */
  createEvent: function(name, data, resolveImmediately){
    if(typeof(resolveImmediately)=='undefined') resolveImmediately = false;
    var e = new GRASP.Event(name, data, this._promise.getDefer())
    if(resolveImmediately) e.setResponse('resolveImmediately=true');
    this._allEvents.push(e);
    return e;
  },

  /**
   * Publish several events created by this.createEvent
   * usage:
   * e1 = this.createEvent(name, data);
   * e2 = this.createEvent(name, data);
   * this.publishEvent(e1, e1);
   */
  publishEvent: function(){
    var i;
    for(i in arguments){
      this._mediator.dispatch(arguments[i]);
    }
  },

  /**
   * Get response for instant event (instant event is not defer answer, but returns it immediately)
   * @param name
   * @param data
   */
  getInstant: function(name, data){
    var event = this.createEvent(name, data);
    this._mediator.dispatch(event);
    return event.getResponse();
  },

  /**
   * Publish events
   * @param events - every argument is an event.
   * Event can be an array [name, data], string 'name' or GRASP.Event(name, data)
   * If you want to publish array of events, you can call
   * publisher.publish.apply(publisher, [['name1',{}], ['name2',{}], ...])
   */
  publish: function(events){
    for(var i in arguments){
      if(GRASP.typeof(arguments[i]) == 'array') arguments[i] = this.createEvent(arguments[i][0], arguments[i][1], arguments[i][2]);
      else if(GRASP.typeof(arguments[i]) == 'string') arguments[i] = this.createEvent(arguments[i]);
    }
    var promise = this._promise.when.apply(this._promise, arguments);
    this.publishEvent.apply(this, arguments);
    return promise;
  },

  allEventsDone: function(){
    return this._promise.when.apply(this._promise, this._allEvents);
  },

  getAllEvents: function(){
    return this._allEvents;
  }
};
