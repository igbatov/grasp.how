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
 * @param canvasDrawerFactory
 * @constructor
 */
YOVALUE.GraphViewsPubSub = function (subscriber, publisher, graphViewFactory, viewManager, canvasDrawerFactory) {
  this.subscriber = subscriber;
  this.publisher = publisher;
  this.graphViewFactory = graphViewFactory;
  var container = viewManager.getViewContainer('graphViews');
  this.canvasDrawer = canvasDrawerFactory.create(container.id, container.width, container.height);

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

    // do not know, maybe this events will look better in one of the GraphController modules?
    'ctrl_on',
    'ctrl_off'
  ]);

  // GraphView that is used to get text width and height (event get_graph_view_label_area)
  this.dummyGraphView = this.graphViewFactory.create('dummyGraphView', this.canvasDrawer);
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
        if(typeof(this.graphViewList[graphId]) == 'undefined'){
          this.graphViewList[graphId] = this.graphViewFactory.create(graphId, this.canvasDrawer);
          this.graphViewList[graphId].setGraphArea(event.getData()['graphArea']);
          this.graphViewList[graphId].setModel(event.getData()['graphModel']);
          this.graphViewList[graphId].setNodeMapping(event.getData()['nodeMapping']);
          this.graphViewList[graphId].setNodeLabelMapping(event.getData()['nodeLabelMapping']);
          this.graphViewList[graphId].setDecoration(event.getData()['decoration']);
          this.graphViewList[graphId].setSkin(event.getData()['skin']);
          this.graphViewList[graphId].drawGraph();
          //bind event fire for various graphView manipulations
          this.bindPublishers(graphId, event.getData()['eventsToListen']);
        }else{
          if(typeof(event.getData()['graphArea']) !== 'undefined'){
            this.graphViewList[graphId].setGraphArea(event.getData()['graphArea']);
          }
          if(typeof(event.getData()['graphModel']) !== 'undefined'){
            this.graphViewList[graphId].setModel(event.getData()['graphModel']);
          }
          if(typeof(event.getData()['nodeMapping']) !== 'undefined'){
            this.graphViewList[graphId].setNodeMapping(event.getData()['nodeMapping']);
          }
          if(typeof(event.getData()['nodeLabelMapping']) !== 'undefined'){
            this.graphViewList[graphId].setNodeLabelMapping(event.getData()['nodeLabelMapping']);
          }
          if(typeof(event.getData()['decoration']) !== 'undefined'){
            this.graphViewList[graphId].setDecoration(event.getData()['decoration']);
          }
          if(typeof(event.getData()['skin']) !== 'undefined'){
            this.graphViewList[graphId].setSkin(event.getData()['skin']);
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

      case 'ctrl_on':
        for(var i in this.graphViewList){
          this.graphViewList[i].setDragMode('move');
        }
        break;

      case 'ctrl_off':
        for(var i in this.graphViewList) this.graphViewList[i].setDragMode('copy');
        break;

      default:
        break;
    }
    return true;
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
      'clickbackground'
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
        // That is why graphView can only report the canvasDrawer shape the node was dropped on
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
          // GraphView ( = CanvasDrawer = kineticjs) are sometimes fire "dragstartnode" instead of "clicknode"
          // (I do not know why)
          // Such "dragging" always ended dropping on the same node
          // If this is the case we fire here "clicknode" in addition to "dragendnode" event
          if(droppedOnElement && e.fromGraphId == droppedOnGraphId && e.draggedModelElement.element.id == droppedOnElement.element.id){
            eventData = {
              eventType: 'clicknode',
              elementType: 'node',
              graphId: e.fromGraphId,
              element: droppedOnElement.element
            };
            that.publisher.publish(eventData.eventType, eventData);
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

        that.publisher.publish(eventData.eventType, eventData);
      });
    }
  }
};