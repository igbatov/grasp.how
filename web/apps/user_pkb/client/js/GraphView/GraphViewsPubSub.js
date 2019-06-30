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
 * @param publisher
 * @param graphViewFactory
 * @param viewManager
 * @param drawerFactory
 * @constructor
 */
GRASP.GraphViewsPubSub = function (publisher, graphViewFactory, viewManager, drawerFactory, i18n) {
  this.i18n = i18n;
  this.publisher = publisher;
  this.graphViewFactory = graphViewFactory;
  var container = viewManager.getViewContainer('graphViews');
  this.drawer = drawerFactory.create(container.id, container.width, container.height);

  //array of all created GraphViews per se
  this.graphViewList = {};

  // GraphView that is used to get text width and height (event get_graph_view_label_area)
  this.dummyGraphView = this.graphViewFactory.create('dummyGraphView', this.drawer);

  // panel under the graph
  this.bottomPanel = null;
  this.dragMode = GRASP.DragModeChangeController.MOVE;
};

GRASP.GraphViewsPubSub.prototype = {
  eventListener: function(event){

    var eventName = event.getName(), graphId = event.getData() ? event.getData()['graphId'] : null;
    switch (eventName)
    {
      case "hide_all_graphs":
        for(var i in this.graphViewList){
          this.graphViewList[i].hide();
        }
        event.setResponse(true);
        break;

      case "update_graph_view_decoration":
      case "draw_graph_view":

        // GraphViewSettings can be in two forms - iGraphViewSettingsStructOne or iGraphViewSettingsStructTwo
        // If it is in iGraphViewSettingsStructTwo convert it to iGraphViewSettingsStructOne
        var graphViewSettings = {};
        if(GRASP.implements(event.getData(), GRASP.iGraphViewSettingsStructTwo)){
          graphViewSettings = this._convertGraphViewSettings(event.getData());
        }else{
          graphViewSettings = event.getData();
        }

        if(typeof(this.graphViewList[graphId]) == 'undefined'){
          if(!GRASP.implements(graphViewSettings, GRASP.iGraphViewSettingsStructOne)){
            console.log('Error: cannot draw graph - ',graphViewSettings, 'do not implement', GRASP.iGraphViewSettingsStructOne);
            GRASP.errorHandler.throwError('Error: cannot draw graph');
            return false;
          }

          this.graphViewList[graphId] = this.graphViewFactory.create(graphId, this.drawer);
          this.graphViewList[graphId].setGraphArea(graphViewSettings['graphArea']);
          this.graphViewList[graphId].setModel(graphViewSettings['graphModel']);
          this.graphViewList[graphId].setNodeMapping(graphViewSettings['nodeMapping']);
          this.graphViewList[graphId].setNodeLabelMapping(graphViewSettings['nodeLabelMapping']);
          this.graphViewList[graphId].setDecoration(graphViewSettings['decoration']);
          this.graphViewList[graphId].setSkin(graphViewSettings['skin']);
          this.graphViewList[graphId].setDragMode(graphViewSettings['dragMode']);
          this.graphViewList[graphId].setDragRestrictedToArea(graphViewSettings['dragRestrictedToArea']);
          this.graphViewList[graphId].drawGraph();

          this.dragMode = graphViewSettings['dragMode'];

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
          if(typeof(graphViewSettings['areaStyle']) !== 'undefined'){
            this.graphViewList[graphId].setAreaStyle(graphViewSettings['areaStyle']);
          }
          this.graphViewList[graphId].drawGraph();
        }
        event.setResponse(true);
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

      case 'get_graph_view_drag_mode':
        event.setResponse(this.graphViewList[graphId].getDragMode());
        break;

      case 'get_graph_area':
        event.setResponse(this.graphViewList[graphId].getGraphArea());
        break;

      case 'set_drag_mode':
        this.dragMode = event.getData()['drag_mode'];
        for(var i in this.graphViewList){
          var isNewNodeGraph = this.publisher.getInstant("is_new_node_graph_id", {'graphId':this.graphViewList[i].getId()});
          if(!isNewNodeGraph){
            this.graphViewList[this.graphViewList[i].getId()].setDragMode(this.dragMode);
          }
        }
        this._setBottomPanelSwitchClass(this.dragMode);
        break;

      case 'draw_graph_bottom_panel':
        if (this.bottomPanel){
          // already created, just set switch in correct position
          this._setBottomPanelSwitchClass(this.dragMode);
          event.setResponse(true);
          return;
        }
        this.bottomPanel = {};
        this.bottomPanel['area'] = event.getData()['area'];
        var switchsvg = '<svg cursor="pointer" version="1.1" id="graphModeSwitch" class="graphModeSwitch" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\n' +
            '\t viewBox="0 0 200 18"  height="18" width="200" style="enable-background:new 0 0 200 18;" xml:space="preserve">\n' +
            '<path class="slot" d="M24.5,13.4H8.2c-2.3,0-4.1-1.8-4.1-4.1V8.6c0-2.3,1.8-4.1,4.1-4.1h16.3c2.3,0,4.1,1.8,4.1,4.1v0.7\n' +
            '\tC28.6,11.6,26.7,13.4,24.5,13.4z"/>\n' +
            '<path class="knob" d="M12.2,2.8c2.3,0.7,3.9,2.3,4.5,4.6c0.1,0.5,0.2,0.8,0.2,1.6c0,0.8,0,1.1-0.2,1.6c-0.6,2.3-2.3,4-4.6,4.7\n' +
            '\tc-0.8,0.2-2.3,0.2-3.2,0c-2.3-0.6-4-2.4-4.7-4.7C4,9.7,4,8.2,4.3,7.4C4.9,4.9,7,3,9.6,2.6C10.3,2.5,11.5,2.6,12.2,2.8z"/>\n' +
            '<text visibility="hidden" id="164" class="offText" fill="#BBBBBB" opacity="1" font-family="Roboto" font-size="12" pointer-events="none" transform="matrix(1 0 0 1 45 4)">' +
            '<tspan x="0" dy="0.8em">'+this.i18n.__('Drag mode')+'</tspan></text>' +
            '<text visibility="hidden" id="164" class="onText" fill="#BBBBBB" opacity="1" font-family="Roboto" font-size="12" pointer-events="none" transform="matrix(1 0 0 1 45 4)">' +
            '<tspan x="0" dy="0.8em">'+this.i18n.__('Connect mode')+'</tspan></text>' +
            '</svg>';
        this.bottomPanel['layer'] = this.drawer.addLayer("graph_bottom_panel");
        var panel = this.drawer.createGroup({
          x: this.bottomPanel['area'].centerX - this.bottomPanel['area'].width/2,
          y: this.bottomPanel['area'].centerY
        });
        this.bottomPanel['switch'] = this.drawer.createShape('svg', {
          svgxml: switchsvg
        });
        panel.add(this.bottomPanel['switch']);
        this.drawer.addShape(this.bottomPanel['layer'], panel);
        this.bottomPanel['switchDefaultClass'] = this.bottomPanel['switch'].getShape().getAttribute('class');
        this._setBottomPanelSwitchClass(this.dragMode);
        var that = this;
        this.bottomPanel['switch'].getShape().addEventListener('click', function(){
          var newDragMode = that.dragMode === GRASP.DragModeChangeController.MOVE ?
              GRASP.DragModeChangeController.CONNECT : GRASP.DragModeChangeController.MOVE;
          that._setBottomPanelSwitchClass(newDragMode);
          that.publisher.publish(['set_drag_mode', {drag_mode:newDragMode}, true]);
        });
        event.setResponse(true);
        break;

      default:
        break;
    }
    return true;
  },

  _setBottomPanelSwitchClass: function(dragMode){
    if (dragMode === GRASP.DragModeChangeController.MOVE) {
      this.bottomPanel['switch'].getShape().setAttribute(
          'class',
          this.bottomPanel['switchDefaultClass']+' off'
      );
    } else {
      this.bottomPanel['switch'].getShape().setAttribute(
          'class',
          this.bottomPanel['switchDefaultClass']+' on'
      );
    }
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
        nodeMapping = graphViewSettingsStructTwo['nodeMapping'],
        dragRestrictedToArea = graphViewSettingsStructTwo['dragRestrictedToArea'];

    var i, graphNodes = graphModel.nodes, graphEdges = graphModel.edges;

    var nodes = {};
    var graphNode;
    var nodeAttr;
    for(i in graphNodes){
      graphNode = graphNodes[i];
      nodeAttr = graphNodeAttributes[graphNode.nodeContentId];
      nodes[graphNode.id] = {
        id: graphNode.id,
        type: nodeAttr.type,
        label: nodeAttr.label,
        reliability: nodeAttr.reliability,
        importance: nodeAttr.importance,
        icon: nodeAttr.icon,
        nodeContentId: graphNode.nodeContentId,
        active_alternative_id: nodeAttr.active_alternative_id
      };
    }

    // Create from graphEdge and graphEdgeAttributes nodes that GraphView is waiting from us
    // - see implementation of GRASP.iGraphViewModel
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
      dragMode: graphViewSettingsStructTwo.dragMode,
      dragRestrictedToArea: dragRestrictedToArea,
    };

    return graphViewSettings;
  },

  /**
   *
   * @param graphId
   * @param eventsToListen
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
      GRASP.errorHandler.notifyError("Cannot find graph '" + graphId +"'");
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

          var graphArea = that.graphViewList[droppedOnGraphId].getNodeMapping().area;
          // convert global x, y into relative to graph area
          var y = e.draggedModelElementXY.y - (graphArea.centerY - graphArea.height/2);
          var x = e.draggedModelElementXY.x - (graphArea.centerX - graphArea.width/2);

          eventData = {
            eventType: e.eventType,
            fromGraphId: e.fromGraphId,
            draggedModelElement: e.draggedModelElement,
            droppedOnGraphId: droppedOnGraphId,
            droppedOnModelElement: droppedOnElement,
            draggedModelElementXY: {x:x, y:y}
          }
        }else{
          eventData = e;
        }
        that.publisher.publish([eventData.eventType, eventData]);
      });
    }
  }
};