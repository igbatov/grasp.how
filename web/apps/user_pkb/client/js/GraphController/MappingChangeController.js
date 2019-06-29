/**
 * This controller is used react on user node dragging in GraphView dragMode='move'
 * - it redraws graph when user moves node
 * - it saves mapping of nodes after user stopped drag node
 * Note that it react only when dragMode is 'move'
 * Node mapping saving in case of model change (dragNode is 'connect') handled by ModelChangeController
 * @param publisher
 * @constructor
 */

GRASP.MappingChangeController = function(publisher){
  this.publisher = publisher;
};

GRASP.MappingChangeController.prototype = {
  execute: function(event, selectedElement){

    if(!event.getData()) return false;

    var that = this,
        m, eventName = event.getName(),
        dragMode,
        graphId = (eventName == 'dragendnode' ? event.getData()['fromGraphId'] : event.getData()['graphId']),
        acceptedEvents = ['dragstartnode', 'draggingnode', 'dragendnode'];

    // reject in the explicit form all events except those in acceptedEvents
    if(acceptedEvents.indexOf(eventName) == -1) return;

    // we work only if the mode of dragging is 'move'
    dragMode = this.publisher.getInstant('get_graph_view_drag_mode', {graphId: graphId});
    if(dragMode != 'move') return;

    if(eventName == 'dragstartnode'){
      m = GRASP.clone(this.publisher.getInstant('get_graph_view_node_mapping', {graphId: graphId}));
      this.pointerStartXY = {
        x: event.getData()['x'],
        y: event.getData()['y']
      };

      // move node center under cursor (otherwise it slips away after fast mose move)
      var rect = event.getData()['svgroot'].getBoundingClientRect()
      m.mapping[event.getData()['element'].id].x = this.pointerStartXY.x - rect.left;
      m.mapping[event.getData()['element'].id].y = this.pointerStartXY.y - rect.top;
      this.nodeStartXY = {
        x: m.mapping[event.getData()['element'].id].x,
        y: m.mapping[event.getData()['element'].id].y
      };

      // new mapping of graph
      var graphViewSettings = {
        graphId: graphId,
        nodeMapping: m,
        nodeLabelMapping: m
      };
      that.publisher.publish(["draw_graph_view", graphViewSettings, true]);

    }

    if(eventName == 'draggingnode'){
      var graphArea = this.publisher.getInstant('get_graph_area', {graphId: graphId});
      m = this.publisher.getInstant('get_graph_view_node_mapping', {graphId: graphId});
      var newX = this.nodeStartXY.x + (event.getData()['x'] - this.pointerStartXY.x);
      var newY = this.nodeStartXY.y + (event.getData()['y'] - this.pointerStartXY.y);

      // prevent dragging outside graphArea
      if(
        newX > graphArea.centerX+graphArea.width/2
        || newX < graphArea.centerX-graphArea.width/2
        || newY > graphArea.centerY+graphArea.height/2
        || newY < graphArea.centerY-graphArea.height/2
      ) {
        return;
      }

      m.mapping[event.getData()['draggedModelElement']['element'].id].x = newX;
      m.mapping[event.getData()['draggedModelElement']['element'].id].y = newY;

      // iGraphViewSettingsStructOne
      var graphViewSettings = {
        areaStyle: {stroke: '#BBBBBB', strokeWidth: 0.5, strokeDasharray: '10 5'},
        graphId: graphId,
        nodeMapping: m,
        nodeLabelMapping: m,
      };
      that.publisher.publish(["draw_graph_view", graphViewSettings, true]);
    }

    if(eventName == 'dragendnode'){
      m = this.publisher.getInstant('get_graph_view_node_mapping', {graphId: graphId});
      that.publisher.publish(["node_mapping_changed", {graphId: graphId, node_mapping: m}, true]);
      // iGraphViewSettingsStructOne
      var graphViewSettings = {
        graphId: graphId,
        areaStyle: {stroke: '', strokeWidth: 0, strokeDasharray: ''},
      };
      that.publisher.publish(["draw_graph_view", graphViewSettings, true]);
    }
  }
};