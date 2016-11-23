GRASP.Subscriber = function(mediator){
  this._mediator = mediator;
};

GRASP.Subscriber.prototype = {
  subscribe: function(listener, eventNames){
    //sanity check
    if (!(GRASP.implements(listener, GRASP.iListener))) {
      GRASP.errorHandler.throwError("listener do not has GRASP.iListener interface");
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