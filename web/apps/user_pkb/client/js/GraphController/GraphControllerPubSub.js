/**
 * This is container for all modules that react on user-generated events (mouseonnode, mouseclicknode, etc.)
 * It stores current selected element - this.selectedElement
 * and call all its models in a given order after event reception.
 * @param publisher
 * @param controllerModules
 * @constructor
 */
GRASP.GraphControllerPubSub = function(publisher, controllerModules){
  this.controllerModules = controllerModules;
  this.publisher = publisher;
  // current selected graph element
  this.selectedElement = {graphId: null, elementType: null, element: null};
};

GRASP.GraphControllerPubSub.prototype = {
  eventListener: function(event){
    var i;
    for(i in this.controllerModules){
      if(this.controllerModules[i].execute) this.controllerModules[i].execute(event, this.selectedElement);
    }
  }
};