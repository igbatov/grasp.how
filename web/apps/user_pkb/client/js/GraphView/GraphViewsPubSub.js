/**
 * The goal of this module is to create, position, draw, redraw and remove GraphViews on
 * various external events like
 * 'create_graph_view',
 * 'show_graph_view',
 * 'hide_graph_view',
 * 'redraw_graph_view',
 * 'remove_graph_view',
 *
 * 'get_graph_view_label_area'
 *
 * It also publishes events if user try to do something with graph:
 *
 * @param subscriber
 * @param publisher
 * @param graphViewFactory
 * @param viewManager
 * @param drawerFactory
 * @constructor
 */
YOVALUE.GraphViewsPubSub = function (subscriber, publisher, graphViewFactory, viewManager, drawerFactory) {
  this.subscriber = subscriber;
  this.publisher = publisher;
  this.graphViewFactory = graphViewFactory;
  var container = viewManager.getViewContainer('graphViews');
  this.drawer = drawerFactory.create(container.id, container.width, container.height);

  //array of all created GraphViews per se
  this.graphViewList = {};

  this.subscriber.subscribe(this,[
    'hide_all_graphs',
    'draw_graph_view',

    'get_graph_view_label_area',

    'get_graph_view_node_mapping',
    'get_graph_view_node_label_mapping',
    'get_graph_view_decoration',

    'set_graph_view_drag_mode',
    'get_graph_view_drag_mode',

    'set_drag_mode'
  ]);

  // GraphView that is used to get text width and height (event get_graph_view_label_area)
  this.dummyGraphView = this.graphViewFactory.create('dummyGraphView', this.drawer);
};

YOVALUE.GraphViewsPubSub.prototype = {
  eventListener: function(event){

    var eventName = event.getName(), graphId = event.getData() ? event.getData()['graphId'] : null;
    switch (eventName)
    {
      case "hide_all_graphs":
        for(var i in this.graphViewList){
          this.graphViewList[i].hide();
        }
        break;

      case "draw_graph_view":

        // GraphViewSettings can be in two forms - iGraphViewSettingsStructOne or iGraphViewSettingsStructTwo
        // If it is in iGraphViewSettingsStructTwo convert it to iGraphViewSettingsStructOne
        var graphViewSettings = {};
        if(YOVALUE.implements(event.getData(), YOVALUE.iGraphViewSettingsStructTwo)){
          graphViewSettings = this._convertGraphViewSettings(event.getData());
        }else{
          graphViewSettings = event.getData();
        }

        if(typeof(this.graphViewList[graphId]) == 'undefined'){
          this.graphViewList[graphId] = this.graphViewFactory.create(graphId, this.drawer);
          this.graphViewList[graphId].setGraphArea(graphViewSettings['graphArea']);
          this.graphViewList[graphId].setModel(graphViewSettings['graphModel']);
          this.graphViewList[graphId].setNodeMapping(graphViewSettings['nodeMapping']);
          this.graphViewList[graphId].setNodeLabelMapping(graphViewSettings['nodeLabelMapping']);
          this.graphViewList[graphId].setDecoration(graphViewSettings['decoration']);
          this.graphViewList[graphId].setSkin(graphViewSettings['skin']);
          this.graphViewList[graphId].setDragMode(graphViewSettings['dragMode']);
          this.graphViewList[graphId].drawGraph();
          //bind event fire for various graphView manipulations
          this.bindPublishers(graphId, graphViewSettings['eventsToListen']);
        }else{
          if(typeof(graphViewSettings['graphArea']) !== 'undefined'){
            this.graphViewList[graphId].setGraphArea(graphViewSettings['graphArea']);
          }
          if(typeof(graphViewSettings['graphModel']) !== 'undefined'){
            this.graphViewList[graphId].setModel(graphViewSettings['graphModel']);
          }
          if(typeof(graphViewSettings['nodeMapping']) !== 'undefined'){
            this.graphViewList[graphId].setNodeMapping(graphViewSettings['nodeMapping']);
          }
          if(typeof(graphViewSettings['nodeLabelMapping']) !== 'undefined'){
            this.graphViewList[graphId].setNodeLabelMapping(graphViewSettings['nodeLabelMapping']);
          }
          if(typeof(graphViewSettings['decoration']) !== 'undefined'){
            this.graphViewList[graphId].setDecoration(graphViewSettings['decoration']);
          }
          if(typeof(graphViewSettings['skin']) !== 'undefined'){
            this.graphViewList[graphId].setSkin(graphViewSettings['skin']);
          }
          this.graphViewList[graphId].drawGraph();
        }
        break;

      case "get_graph_view_label_area":
        var labelAreaArray = {}, i;

        this.dummyGraphView.setSkin(event.getData()['skin']);
        var nodeLabels = event.getData()['nodeLabels'];
        for(i in nodeLabels){
          labelAreaArray[nodeLabels[i].id] = this.dummyGraphView.getTextArea(nodeLabels[i].label, nodeLabels[i].size);
        }
        event.setResponse(labelAreaArray);
        break;

      case 'get_graph_view_node_mapping':
        event.setResponse(this.graphViewList[graphId].getNodeMapping());
        break;

      case 'get_graph_view_node_label_mapping':
        event.setResponse(this.graphViewList[graphId].getNodeLabelMapping());
        break;

      case 'get_graph_view_decoration':
        event.setResponse(this.graphViewList[graphId].getDecoration());
        break;

      case 'set_graph_view_drag_mode':
        this.graphViewList[graphId].setDragMode(event.getData()['mode']);
        break;

      case 'get_graph_view_drag_mode':
        event.setResponse(this.graphViewList[graphId].getDragMode());
        break;

      case 'set_drag_mode':
        for(var i in this.graphViewList){
          if(!this.isNewNodeGraph(this.graphViewList[i].getId())){
            this.graphViewList[this.graphViewList[i].getId()].setDragMode(event.getData()['drag_mode']);
          }
        }
        break;

      default:
        break;
    }
    return true;
  },

  isNewNodeGraph: function(graphId){
    return graphId.indexOf('newNodes') != -1;
  },

  /**
   *
   * @param graphViewSettingsStructTwo
   * @returns graphViewSettingsStructOne
   * @private
   */
  _convertGraphViewSettings: function(graphViewSettingsStructTwo){
    var graphModel = graphViewSettingsStructTwo['graphModel'],
        graphId = graphViewSettingsStructTwo['graphId'],
        skin = graphViewSettingsStructTwo['skin'],
        layout = graphViewSettingsStructTwo['layout'],
        graphNodeAttributes = graphViewSettingsStructTwo['graphNodeAttributes'],
        graphEdgeAttributes = graphViewSettingsStructTwo['graphEdgeAttributes'],
        decoration = graphViewSettingsStructTwo['decoration'],
        nodeMapping = graphViewSettingsStructTwo['nodeMapping'];

    var i, graphNodes = graphModel.nodes, graphEdges = graphModel.edges;

    var nodes = {};
    var graphNode;

    for(i in graphNodes){
      graphNode = graphNodes[i];
      nodes[graphNode.id] = {
        id: graphNode.id,
        type: graphNodeAttributes[graphNode.nodeContentId].type,
        label: graphNodeAttributes[graphNode.nodeContentId].label,
        reliability: graphNodeAttributes[graphNode.nodeContentId].reliability,
        importance: graphNodeAttributes[graphNode.nodeContentId].importance,
        icon: graphNodeAttributes[graphNode.nodeContentId].icon,
        nodeContentId: graphNode.nodeContentId
      };
    }

    // Create from graphEdge and graphEdgeAttributes nodes that GraphView is waiting from us
    // - see implementation of YOVALUE.iGraphViewModel
    var edges = {};
    var graphEdge;

    for(i in graphEdges){
      graphEdge = graphEdges[i];
      edges[graphEdge.id] = {
        id: graphEdge.id,
        source: graphEdge.source,
        target: graphEdge.target,
        type: graphEdgeAttributes[graphEdge.edgeContentId].type,
        label: graphEdgeAttributes[graphEdge.edgeContentId].label,
        edgeContentId: graphEdge.edgeContentId
      };
    }

    var graphViewSettings = {
      graphId: graphId,
      graphModel: {nodes: nodes, edges: edges},
      graphArea: nodeMapping.area,
      nodeMapping: nodeMapping,
      nodeLabelMapping: nodeMapping,
      decoration: decoration,
      skin: skin,
      dragMode: graphViewSettingsStructTwo.dragMode
    };

    return graphViewSettings;
  },

  /**
   *
   * @param graphId
   */
  bindPublishers: function(graphId, eventsToListen){
    var that = this,
    eventNames = typeof(eventsToListen) != 'undefined' ? eventsToListen : [
     // 'mousemove',
      'mouseenternode',
      'mouseleavenode',
      'clicknode',
      'dragstartnode',
      'draggingnode',
      'dragendnode',
      'clickedge',
      'mouseenteredge',
      'mouseleaveedge',
      'clickbackground',
      'dblclickbackground'
    ];

    // Sanity check
    if(typeof(this.graphViewList[graphId]) == 'undefined'){
      YOVALUE.errorHandler.notifyError("Cannot find graph '" + graphId +"'");
    }

    for(var i in eventNames){
      var eventName = eventNames[i];
      this.graphViewList[graphId].bind(eventName, function(e){
        var eventData;

        // 'dragendnode' is special event because we can drag node from one graphView to another
        // That is why graphView can only report the drawer shape the node was dropped on
        // and here we must find graphView and element that corresponds to shape the node was dropped on
        if(e.eventType == 'dragendnode'){
          var graphId, j, el, droppedOnGraphId, droppedOnElement;
          for(graphId in that.graphViewList){
            for(j in e.droppedOnShapeIds){
              el = that.graphViewList[graphId].findModelElementByShapeId(e.droppedOnShapeIds[j]);
              if(el && el.type == 'node'){
                droppedOnElement = el;
              }
              if(el && el.type == 'background'){
                droppedOnGraphId = graphId;
              }
            }
          }

          // ugly hack:
          // GraphView ( -> CanvasDrawer -> kineticjs) are sometimes fire "dragstartnode" instead of "clicknode"
          // Such "dragging" always ended dropping on the same node
          // If this is the case we fire here "clicknode" in addition to "dragendnode" event
          if(droppedOnElement && e.fromGraphId == droppedOnGraphId && e.draggedModelElement.element.id == droppedOnElement.element.id){
            eventData = {
              eventType: 'clicknode',
              elementType: 'node',
              graphId: e.fromGraphId,
              element: droppedOnElement.element
            };
            that.publisher.publish([eventData.eventType, eventData]);
          }

          eventData = {
            eventType: e.eventType,
            fromGraphId: e.fromGraphId,
            draggedModelElement: e.draggedModelElement,
            droppedOnGraphId: droppedOnGraphId,
            droppedOnModelElement: droppedOnElement
          }
        }else{
          eventData = e;
        }
        if(eventData.eventType == 'mouseenternode') console.log(eventData.eventType, eventData);
        that.publisher.publish([eventData.eventType, eventData]);
      });
    }
  }
};