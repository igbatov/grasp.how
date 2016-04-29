YOVALUE.GraphControllerPubSub = function(publisher, controllerModules){
  this.controllerModules = controllerModules;
  this.publisher = publisher;
  // current selected graph element
  this.selectedElement = {graphId: null, elementType: null, element: null};
};

YOVALUE.GraphControllerPubSub.prototype = {
  eventListener: function(event){
    var i;
    for(i in this.controllerModules){
      this.controllerModules[i].execute(event, this.selectedElement);
    }
  }
};