YOVALUE.Subscriber = function(mediator){
  this._mediator = mediator;
}

YOVALUE.Subscriber.prototype = {
  subscribe: function(listener, eventNames){
    //sanity check
    if (!(YOVALUE.implements(listener, YOVALUE.iListener))) {
      YOVALUE.errorHandler.throwError("listener do not has YOVALUE.iListener interface");
    }

    var i;
    for(i in eventNames){
      this._mediator.addListener(eventNames[i], listener);
    }
  },
  removeSubscribe: function(listener, eventNames){
    var i;
    for(i in eventNames){
      this._mediator.removeListener(eventNames[i], listener);
    }
  }
};