/**
 *
 * @param mediator
 * @param promise is the implementation of CommonJS Promises/A and must have interface
 * {
 *  getDefer:function,  // create new defer (like jQuery.Deferred). Defer should implement one method - resolve()
 *  when:function,      // schedule callback on defer resolve (like jQuery.when)
 *  then:function       // schedule callback on next defer (like jQuery.then)
 * }
 *
 * @constructor
 */
YOVALUE.Publisher = function(mediator, promise){
  this._mediator = mediator;
  this._promise = promise;
};

YOVALUE.Publisher.prototype = {
  createEvent: function(name,data){
    return new YOVALUE.Event(name, data, this._promise.getDefer())
  },

  /**
   * Publish one event with name "name" and data "data"
   * @param name
   * @param data
   * @returns {*}
   */
  publish: function(name, data){
    var e = this.createEvent(name, data);
    this.publishEvent(e);
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
   * Publish one event created by this.createEvent(name, data);
   * and return response immediately
   * @param event
   * @returns {*}
   */
  publishResponseEvent: function(event){
    this._mediator.dispatch(event);
    return event.getResponse();
  },

  /**
   *
   * @param {Array<YOVALUE.Event>} events
   */
  when: function(){
    return this._promise.when.apply(this._promise, arguments);
  }
};
