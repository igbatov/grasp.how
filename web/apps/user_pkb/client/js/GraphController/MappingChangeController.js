/**
 * This controller is used react on user node dragging in GraphView dragMode='move'
 * - it redraws graph when user moves node
 * - it saves mapping of nodes after user stopped drag node
 * Note that it react only when dragMode is 'move'
 * Node mapping saving in case of model change (dragNode is 'connect') handled by ModelChangeController
 * @param publisher
 * @constructor
 */

YOVALUE.MappingChangeController = function(publisher){
  this.publisher = publisher;
};

YOVALUE.MappingChangeController.prototype = {
  execute: function(event, selectedElement){
    var that = this,
        m, eventName = event.getName(),
        dragMode,
        graphId = (eventName == 'dragendnode' ? event.getData()['fromGraphId'] : event.getData()['graphId']),
        acceptedEvents = ['dragstartnode', 'draggingnode', 'dragendnode'];

    // reject in the explicit form all events except those in acceptedEvents
    if(acceptedEvents.indexOf(eventName) == -1) return;

    // we work with dragendnode only if the mode of dragging is 'connect'
    dragMode = this.publisher.publishResponseEvent(this.publisher.createEvent('get_graph_view_drag_mode', {graphId: graphId}));
    if(dragMode != 'move') return;

    if(eventName == 'dragstartnode'){
      m = this.publisher.publishResponseEvent(this.publisher.createEvent('get_graph_view_node_mapping', {graphId: graphId}));
      this.nodeStartXY = {
        x: m.mapping[event.getData()['element'].id].x,
        y: m.mapping[event.getData()['element'].id].y
      };
      this.pointerStartXY = {
        x: event.getData()['x'],
        y: event.getData()['y']
      };
    }
    if(eventName == 'draggingnode'){
      m = this.publisher.publishResponseEvent(this.publisher.createEvent('get_graph_view_node_mapping', {graphId: graphId}));
      m.mapping[event.getData()['draggedModelElement']['element'].id].x = this.nodeStartXY.x + (event.getData()['x'] - this.pointerStartXY.x);
      m.mapping[event.getData()['draggedModelElement']['element'].id].y = this.nodeStartXY.y + (event.getData()['y'] - this.pointerStartXY.y);
      var graphViewSettings = {
        graphId: graphId,
        nodeMapping: m,
        nodeLabelMapping: m
      };
      that.publisher.publish("draw_graph_view", graphViewSettings);
    }

    if(eventName == 'dragendnode'){
      m = this.publisher.publishResponseEvent(this.publisher.createEvent('get_graph_view_node_mapping', {graphId: graphId}));
      that.publisher.publish("node_mapping_changed", {graphId: graphId, node_mapping: m});
    }
  }
};