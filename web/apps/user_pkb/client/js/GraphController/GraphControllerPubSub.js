YOVALUE.GraphControllerPubSub = function(subscriber, publisher, controllerModules){
  this.controllerModules = controllerModules;
  this.subscriber = subscriber;
  this.publisher = publisher;
  // current selected graph element
  this.selectedElement = {graphId: null, elementType: null, element: null};

  this.subscriber.subscribe(this,[
    'show_graphs',

    'graph_model_changed',
    'graph_history_item_added',
    'graph_element_content_changed',
    'graph_position_changed',
    'graph_layout_changed',

    'mousemove',
    'mouseenternode',
    'mouseleavenode',
    'clicknode',
    'dragstartnode',
    'draggingnode',
    'dragendnode',
    'clickedge',
    'clickbackground',
    'mouseenteredge',
    'mouseleaveedge',

    'delete_pressed',
    'undo_pressed',
    'redo_pressed',

    'element_editor_focusin',
    'element_editor_focusout'
  ]);
};

YOVALUE.GraphControllerPubSub.prototype = {
  eventListener: function(event){
    var i;
    for(i in this.controllerModules){
      this.controllerModules[i].execute(event, this.selectedElement);
    }
  }
};