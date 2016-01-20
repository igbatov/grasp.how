/**
 * Instance of this constructor draws graph model on canvas
 * and bind events to node drag'n'drops, clicks, double clicks, mousemove
 * @param graphId
 * @param drawer
 * @param nodeFactory
 * @param edgeFactory
 * @param labelFactory
 * @constructor
 */
YOVALUE.GraphView = function (graphId, drawer, nodeFactory, edgeFactory, labelFactory) {
  this.graphId = graphId;
  this.drawer = drawer;

  //table for GraphView elements: nodes, edges and node labels
  // element = GraphViewEdge or GraphViewNode
  // elementType = 'node' or 'edge'
  // elementId = model node or edge id
  // drawerShapeId = id of drawer object
  this.graphViewElements = new YOVALUE.Table(['element', 'elementType', 'elementId', 'drawerShapeId']);

  //GraphView element factories
  this.nodeFactory = nodeFactory;
  this.edgeFactory = edgeFactory;
  this.labelFactory = labelFactory;

  //GraphView settings
  this.graphArea = null;
  this.nodeMapping = {};
  this.nodeLabelMapping = {};
  this.decoration = {};
  this.model = {};
  this.skin = {};

  //create background layer and rectangle that will fill the full graph area
  this.backgroundLayerId = drawer.addLayer(graphId+"_background");
  this.backgroundShape = drawer.createShape('rectangle', {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  });
  this.backgroundShape.setId(this.backgroundShape._id);
  this.drawer.addShape(this.backgroundLayerId, this.backgroundShape);

  //create three layers on a drawer stage - for nodes, edges and labels
  this.edgeLayerId = drawer.addLayer(graphId+"_edges");
  this.nodeLayerId = drawer.addLayer(graphId+"_nodes");
  this.nodeLabelLayerId = drawer.addLayer(graphId+"_node_labels");


  //event types that can be passed to bind() method
  this.eventTypes = [
    'mousemove',
    'clicknode',
    'mouseenternode',
    'mouseleavenode',
    'dragstartnode',
    'draggingnode',
    'dragendnode',
    'clickedge',
    'mouseenteredge',
    'mouseleaveedge',
    'clickbackground'
  ];

  //table of all callbacks bindIds
  this.callbackBindsTable = new YOVALUE.Table(['eventType','shapeId', 'callback','bindId']);

  //table of all user (i.e. registered with this.bind()) callbacks
  this.userCallbacksTable = new YOVALUE.Table(['eventType', 'callback']);

  // Modes can by 'copy' and 'move'. While in the latter mode
  // node actually changes its position, in the former
  // it stays on its place only showing were it will be moved
  this.dragMode = 'copy';

  //drag'n'drop state variables
  this.isNodeDraggedStarted = false;
  this.currentDraggedShapeId = null;
  this.draggedElement = null; // dragging GraphView element
  this.draggedModelElement = null; // dragging model element
  this.droppedOnShapeIds = null;
  this.dragendCallbackCallsCount = 0;

  //visibility of the whole graph
  this.graphIsVisible = true;

};

/**
 * Implements iGraphView
 * @type {Object}
 */
YOVALUE.GraphView.prototype = {
  /**
   * Remove this graph view with all its canvas elements and its callback bindings
   */
  remove: function(){
    //unbind all callbacks
    var events = this.bindEvents;
    for(var i in events){
      this.unbind(events[i]);
    }

    //remove layers and all its shapes
    this.drawer.removeLayer(this.backgroundLayerId);
    this.drawer.removeLayer(this.edgeLayerId);
    this.drawer.removeLayer(this.nodeLayerId);
    this.drawer.removeLayer(this.nodeLabelLayerId);
  },

  /**
   * Hide all layers of this graph
   */
  hide: function(){
    if(!this.graphIsVisible) return;

    this.drawer.hideLayer(this.backgroundLayerId);
    this.drawer.hideLayer(this.edgeLayerId);
    this.drawer.hideLayer(this.nodeLayerId);
    this.drawer.hideLayer(this.nodeLabelLayerId);
    this.muteCallbacks();
    this.graphIsVisible = false;
  },

  /**
   * Show all layers of this graph
   */
  show: function(){
    if(this.graphIsVisible) return;
    //show layers
    this.drawer.showLayer(this.backgroundLayerId);
    this.drawer.showLayer(this.edgeLayerId);
    this.drawer.showLayer(this.nodeLayerId);
    this.drawer.showLayer(this.nodeLabelLayerId);
    this.muteCallbacks(false);
    this.graphIsVisible = true;
  },

  /**
   * @param mapping must implement YOVALUE.iMapping
   */
  setNodeMapping: function(mapping){
    //sanity check
    if(!YOVALUE.implements(mapping, YOVALUE.iMapping)){
      YOVALUE.errorHandler.throwError('mapping does not implement iMapping');
    }
    this.nodeMapping = YOVALUE.MappingHelper.adjustMappingToArea(mapping, this.graphArea);
  },

  getNodeMapping: function(){
    return this.nodeMapping;
  },

  /**
   * @param mapping - must implement YOVALUE.iMapping
   */
  setNodeLabelMapping: function(mapping){
    //sanity check
    if(!YOVALUE.implements(mapping, YOVALUE.iMapping)){
      YOVALUE.errorHandler.throwError('mapping does not implement iMapping');
    }
    this.nodeLabelMapping = YOVALUE.MappingHelper.adjustMappingToArea(mapping, this.graphArea);
  },

  getNodeLabelMapping: function(){
    return this.nodeLabelMapping;
  },

  /**
   * @param area - area occupied by graph on a canvas in a form {centerX:x, centerY:y, width:w, height:h}
   */
  setGraphArea: function(area){
    if(this.graphArea != null && area.centerX == this.graphArea.centerX && area.centerY == this.graphArea.centerY && area.width == this.graphArea.width && area.height == this.graphArea.height) return;
    this.graphArea = area;

    try{
      this.nodeMapping = YOVALUE.MappingHelper.adjustMappingToArea(this.nodeMapping, this.graphArea);
    }catch(e){}

    try{
      this.nodeLabelMapping = YOVALUE.MappingHelper.adjustMappingToArea(this.nodeLabelMapping, this.graphArea);
    }catch(e){}

    try{
      this.decoration = YOVALUE.decorationHelper.adjustDecorationToArea(this.decoration, this.graphArea);
    }catch(e){}

    var startX = parseInt(this.graphArea.centerX - this.graphArea.width/2);
    var startY = parseInt(this.graphArea.centerY - this.graphArea.height/2);

    this.drawer.showLayer(this.backgroundLayerId);
    this.backgroundShape.setX(startX);
    this.backgroundShape.setY(startY);
    this.backgroundShape.setWidth(this.graphArea.width);
    this.backgroundShape.setHeight(this.graphArea.height);
    this.drawer.drawLayer(this.backgroundLayerId);

    // rebind mousemove to new area
    this.unbind('mousemove');
    var rows = this.userCallbacksTable.getRows({eventType:'mousemove'});
    if(rows.length) this.bind('mousemove', rows[0].callback);
  },

  getGraphArea: function(){
    return this.graphArea;
  },

  /**
   * @param model - must implement interface IGraphViewModel
   */
  setModel: function(model){
    if(!YOVALUE.implements(model, YOVALUE.iGraphViewModel)) {
      console.log(model);
      YOVALUE.errorHandler.throwError("Object do not implement YOVALUE.iGraphViewModel interface");
    }
    this.model = model;
  },

  /**
   * @param decoration - must be in form {nodeId1:{color:color1,opacity:opacity1}, nodeId2:{color:color2,opacity:opacity2}, ...}
   */
  setDecoration: function(decoration){
    this.decoration = decoration;
    this.decoration = YOVALUE.decorationHelper.adjustDecorationToArea(this.decoration, this.graphArea);
  },

  getDecoration: function(){
    return this.decoration;
  },

  setSkin: function(skin){
    this.skin = skin;
  },

  /**
   * Sets drag mode
   * @param mode
   * @returns {boolean}
   */
  setDragMode: function(mode){
    if(mode != 'copy' && mode != 'move'){
      YOVALUE.errorHandler.notifyError("drag mode is not 'copy' nor 'move'");
      return false;
    }

    // cannot change mode in the process of dragging
    if(this.isNodeDraggedStarted == true) return false;

    this.dragMode = mode;
    return true;
  },
  getDragMode: function(){
    return this.dragMode;
  },

  /**
   * Creates (or adjusts if element already exists) canvas elements from given nodes and edges.
   * Adds them to canvas and draw.
   */
  drawGraph: function(){
    this.show();

    if(this.dragMode == 'copy' && this.isNodeDraggedStarted) return;

    if(this.arrangeNodeShapes()){
      this.drawer.drawLayer(this.nodeLayerId);
    }

    if(this.arrangeNodeLabelShapes()){
      this.drawer.drawLayer(this.nodeLabelLayerId);
    }

    if(this.arrangeEdgeShapes()){
      this.drawer.drawLayer(this.edgeLayerId);
    }
  },

  /**
   * Create or adjust drawer shapes for edges
   */
  arrangeEdgeShapes: function(){
    var doNeedRedraw = false,
      i, edgeId, elEdge, edge, rows, p1, p2, nodeMapping = this.nodeMapping.mapping;

    //create array of model edge ids
    var edges = this.model.edges;
    var edgeIds = [];
    for(i in edges){
      edgeIds.push(edges[i].id);
    }

    //create array of edge ids that already has corresponding canvas shape
    rows = this.graphViewElements.getRows({'elementType':'edge'});
    var shapeEdgeIds = [];
    for(i in rows){
      shapeEdgeIds.push(rows[i]['elementId']);
    }

    //create shapes to all edges from model that does not yet has shapes
    var freeEdgeIdsArray = YOVALUE.arrayHelper.difference(edgeIds, shapeEdgeIds);
    for(i in freeEdgeIdsArray){
      doNeedRedraw = true;
      edge = edges[freeEdgeIdsArray[i]];
      p1 = {x:nodeMapping[edge.source].x, y:nodeMapping[edge.source].y};
      p2 = {x:nodeMapping[edge.target].x, y:nodeMapping[edge.target].y};

      elEdge = this.edgeFactory.create(this.skin, {
        edgeId: edge.id,
        edgeType: edge.type,
        start: p1,
        stop: p2,
        color:this.decoration.edges[edge.id].color,
        opacity:this.decoration.edges[edge.id].opacity,
        width:this.decoration.edges[edge.id].width
      },
      this.drawer);

      this.graphViewElements.insertRow({'element':elEdge, 'elementType':elEdge.getElementType(),'elementId':elEdge.getElementId(),'drawerShapeId':elEdge.getDrawerShapeId()});
      //add node shape to node layer
      this.drawer.addShape(this.edgeLayerId, elEdge.getDrawerShape());

      //bind to new edge all user callbacks (that was registered with bind() on all other edges)
      var edgeEvents = ['mouseenteredge', 'mouseleaveedge', 'clickedge'];
      for(i in edgeEvents){
        var rows = this.userCallbacksTable.getRows({'eventType':edgeEvents[i]});
        for(var j in rows){
          this._bindToElement(edgeEvents[i], elEdge, rows[j].callback);
        }
      }
    }

    //adjust shapes that already exists and has correspondent edge in model
    var usedEdgeIdsArray = YOVALUE.arrayHelper.intersection(shapeEdgeIds, edgeIds);
    for(i in usedEdgeIdsArray){
      edgeId = usedEdgeIdsArray[i];
      rows = this.graphViewElements.getRows({'elementType':'edge', 'elementId':edgeId});
      elEdge = rows[0]['element'];
      p1 = {x:nodeMapping[edges[edgeId].source].x, y:nodeMapping[edges[edgeId].source].y};
      p2 = {x:nodeMapping[edges[edgeId].target].x, y:nodeMapping[edges[edgeId].target].y};

      if(
        elEdge.getEdgeType() != edges[edgeId].type ||
        elEdge.getStart().x != p1.x ||
        elEdge.getStart().y != p1.y ||
        elEdge.getStop().x != p2.x ||
        elEdge.getStop().y != p2.y ||
        elEdge.getColor() != this.decoration.edges[edgeId].color ||
        elEdge.getOpacity() != this.decoration.edges[edgeId].opacity ||
        elEdge.getWidth() != this.decoration.edges[edgeId].width
      ){
        doNeedRedraw = true;
        elEdge.setEdgeType(edges[edgeId].type);
        elEdge.setStart(p1);
        elEdge.setStop(p2);
        elEdge.setColor(this.decoration.edges[edgeId].color);
        elEdge.setOpacity(this.decoration.edges[edgeId].opacity);
        elEdge.setWidth(this.decoration.edges[edgeId].width);
      }
    }


    //remove node shapes that do not has correspondent model node
    var obsoleteEdgeIdsArray = YOVALUE.arrayHelper.difference(shapeEdgeIds, edgeIds);
    for(i in obsoleteEdgeIdsArray){
      doNeedRedraw = true;
      edgeId = obsoleteEdgeIdsArray[i];
      rows = this.graphViewElements.getRows({'elementType':'edge', 'elementId':edgeId});
      this._removeElement(rows[0]['element'].getDrawerShapeId());
    }

    return doNeedRedraw;
  },

  /**
   * Create or adjust Drawer shapes for nodes
   */
  arrangeNodeShapes: function(){
    var doNeedRedraw = false, // this will indicate if there were changes that need to be drawn on canvas
      i, nodeId, elNode, node, rows, nodeMapping = this.nodeMapping.mapping;

    //create array of model node ids
    var nodes = this.model.nodes;
    var nodeIds = [];
    for(i in nodes){
      nodeIds.push(nodes[i].id);
    }

    //create array of node ids that already has corresponding canvas shape
    rows = this.graphViewElements.getRows({'elementType':'node'});
    var shapeNodeIds = [];
    for(i in rows){
      shapeNodeIds.push(rows[i]['elementId']);
    }

    //create shapes to all nodes from model that does not yet has shapes and bind default reaction on mouse events
    var freeNodeIdsArray = YOVALUE.arrayHelper.difference(nodeIds, shapeNodeIds);
    for(i in freeNodeIdsArray){
      doNeedRedraw = true;

      node = nodes[freeNodeIdsArray[i]];
      elNode = this.nodeFactory.create(this.skin, {
        nodeId:node.id,
        nodeType:node.type,
        icon:node.icon,
        graphId: this.graphId,
        x:nodeMapping[node.id].x,
        y:nodeMapping[node.id].y,
        size:this.decoration.nodes[node.id].size,
        color:this.decoration.nodes[node.id].color,
        opacity:this.decoration.nodes[node.id].opacity,
        stickers:this.decoration.nodes[node.id].stickers
      },
      this.drawer);

      this.graphViewElements.insertRow({'element':elNode, 'elementType':elNode.getElementType(),'elementId':elNode.getElementId(),'drawerShapeId':elNode.getDrawerShapeId()});
      //add node shape to node layer
      this.drawer.addShape(this.nodeLayerId, elNode.getDrawerShape());

      //bind event helpers
      this._bindToElement('dragstartnode', elNode, this._dragStartNodeHandler.bind(this));
      this._bindToElement('dragendnode', elNode, this._dragEndNodeHandler.bind(this));

      //bind to new node all user callbacks (that was registered with bind() on all other nodes)
      var nodeEvents = ['dragstartnode', 'dragendnode', 'mouseenternode', 'mouseleavenode', 'clicknode'];
      for(i in nodeEvents){
        var rows = this.userCallbacksTable.getRows({'eventType':nodeEvents[i]});
        for(var j in rows){
          this._bindToElement(nodeEvents[i], elNode, rows[j].callback);
        }
      }

    }

    //adjust shapes that already exists and has correspondent node in model
    var usedNodeIdsArray = YOVALUE.arrayHelper.intersection(shapeNodeIds, nodeIds);

    for(i in usedNodeIdsArray){
      nodeId = usedNodeIdsArray[i];
      rows = this.graphViewElements.getRows({'elementType':'node', 'elementId':nodeId});
      elNode = rows[0]['element'];

      if(
        elNode.getSize() != this.decoration.nodes[nodeId].size ||
        elNode.getOpacity() != this.decoration.nodes[nodeId].opacity ||
        elNode.getColor() != this.decoration.nodes[nodeId].color ||
        elNode.getNodeType() != nodes[nodeId].type ||
        elNode.getXY().x != nodeMapping[nodeId].x ||
        elNode.getXY().y != nodeMapping[nodeId].y
      ){
        doNeedRedraw = true;
        elNode.setSize(this.decoration.nodes[nodeId].size);
        elNode.setOpacity(this.decoration.nodes[nodeId].opacity);
        elNode.setColor(this.decoration.nodes[nodeId].color);
        elNode.setNodeType(nodes[nodeId].type);
        elNode.setXY(nodeMapping[nodeId].x, nodeMapping[nodeId].y);
      }

      if(elNode.getIcon() != nodes[nodeId].icon || (elNode.getIcon() && nodes[nodeId].icon && (elNode.getIcon().src != nodes[nodeId].icon.src))){
        doNeedRedraw = true;
        elNode.setIcon(nodes[nodeId].icon);
      }

    }

    //remove node shapes that do not has correspondent model node
    var obsoleteNodeIdsArray = YOVALUE.arrayHelper.difference(shapeNodeIds, nodeIds);
    for(i in obsoleteNodeIdsArray){
      doNeedRedraw = true;
      nodeId = obsoleteNodeIdsArray[i];
      rows = this.graphViewElements.getRows({'elementType':'node', 'elementId':nodeId});
      this._removeElement(rows[0]['element'].getDrawerShapeId());
    }

    return doNeedRedraw;
  },

  /**
   * Create or adjust Drawer shapes for labels
   */
  arrangeNodeLabelShapes: function(){
    var doNeedRedraw = false,
      i, nodeId, elNodeLabel, node, rows, nodeLabelMapping = this.nodeLabelMapping.mapping;

    //create array of model node ids
    var nodes = this.model.nodes;
    var nodeIds = [];
    for(i in nodes){
      nodeIds.push(nodes[i].id);
    }

    //create array of label ids that already has corresponding canvas shape
    rows = this.graphViewElements.getRows({'elementType':'nodeLabel'});
    var shapeNodeLabelIds = [];
    for(i in rows){
      shapeNodeLabelIds.push(rows[i]['elementId']);
    }

    //create label shapes to all nodes from model that does not yet has one
    var freeNodeIdsArray = YOVALUE.arrayHelper.difference(nodeIds, shapeNodeLabelIds);
    for(i in freeNodeIdsArray){

      doNeedRedraw = true;
      nodeId = freeNodeIdsArray[i];
      node = nodes[nodeId];
      elNodeLabel = this.labelFactory.create(this.skin, {
        nodeLabelId:node.id,
        text:node.label,
        graphId: this.graphId,
        x:nodeLabelMapping[node.id].x,
        y:nodeLabelMapping[node.id].y,
        angle:nodeLabelMapping[node.id].angle,
        size:this.decoration.nodeLabels[node.id].size,
        opacity:this.decoration.nodeLabels[node.id].opacity
      },
      this.drawer
      );
      this.graphViewElements.insertRow({'element':elNodeLabel, 'elementType':elNodeLabel.getElementType(),'elementId':elNodeLabel.getElementId(),'drawerShapeId':elNodeLabel.getDrawerShapeId()});
      //add label shape to node layer
      this.drawer.addShape(this.nodeLabelLayerId, elNodeLabel.getDrawerShape());
    }

    //adjust shapes that already exists and has correspondent node in model
    var usedNodeIdsArray = YOVALUE.arrayHelper.intersection(shapeNodeLabelIds, nodeIds);
    for(i in usedNodeIdsArray){
      nodeId = usedNodeIdsArray[i];
      rows = this.graphViewElements.getRows({'elementType':'nodeLabel', 'elementId':nodeId});
      elNodeLabel = rows[0]['element'];

      if(
          elNodeLabel.getText() != nodes[nodeId].label ||
          elNodeLabel.getXY().x != nodeLabelMapping[nodeId].x ||
          elNodeLabel.getXY().y != nodeLabelMapping[nodeId].y ||
          elNodeLabel.getAngle() != nodeLabelMapping[nodeId].angle ||
          elNodeLabel.getSize() != this.decoration.nodeLabels[nodeId].size ||
          elNodeLabel.getOpacity() != this.decoration.nodeLabels[nodeId].opacity
        ){
        doNeedRedraw = true;
        elNodeLabel.setText(nodes[nodeId].label);
        elNodeLabel.setXY(nodeLabelMapping[nodeId].x, nodeLabelMapping[nodeId].y);
        elNodeLabel.setAngle(nodeLabelMapping[nodeId].angle);
        elNodeLabel.setSize(this.decoration.nodeLabels[nodeId].size);
        elNodeLabel.setOpacity(this.decoration.nodeLabels[nodeId].opacity);
      }
    }

    //remove node shapes that do not has correspondent model node
    var obsoleteNodeIdsArray = YOVALUE.arrayHelper.difference(shapeNodeLabelIds, nodeIds);
    for(i in obsoleteNodeIdsArray){
      doNeedRedraw = true;
      nodeId = obsoleteNodeIdsArray[i];
      rows = this.graphViewElements.getRows({'elementType':'nodeLabel', 'elementId':nodeId});
      this._removeElement(rows[0]['element'].getDrawerShapeId());
    }

    return doNeedRedraw;
  },

  isVisible: function(){
    return this.graphIsVisible;
  },

  unbind: function(eventType){
    //unbind all callbacks of this eventType in drawer
    var cbRows = this.callbackBindsTable.getRows({'eventType':eventType});
    for(var i in cbRows){
      if(eventType == 'mousemove') this.drawer.unbindStage(cbRows[i]['bindId']);
      else this.drawer.unbindShape(cbRows[i]['bindId']);
    }

    //remove these callbacks from our table
    var cbRowIds = this.callbackBindsTable.getRowIds({'eventType':eventType});
    this.callbackBindsTable.removeRowByIds(cbRowIds);
  },

  /**
   *
   * @param {Boolean=} mute
   */
  muteCallbacks: function(mute){
    if(typeof(mute) == 'undefined') mute = true;
    var cbRows = this.callbackBindsTable.getRows();
    for(var i in cbRows){
      if(cbRows[i].eventType == 'mousemove') this.drawer.muteStage(cbRows[i].bindId, mute);
    }


    var eRows = this.graphViewElements.getRows();
    for(i in eRows){
      if(this.callbackBindsTable.getRows({shapeId: eRows[i].drawerShapeId}).length){
        this.drawer.muteShape(eRows[i].drawerShapeId, mute);
      }
    }
  },

  /**
   * Bind user mouse interactions with graph elements to callback
   * @param eventType - one of this.eventTypes
   * @param callback - function to be called on eventType fire
   */
  bind: function(eventType, callback){
    var cbId, i= 0;
    if(eventType == 'mousemove'){
      cbId = this.drawer.bindStage('mousemove', this._createCallback(eventType, callback), this.graphArea);
      this.callbackBindsTable.insertRow({eventType:eventType, shapeId:null, bindId:cbId});
    }if(eventType == 'draggingnode'){
      cbId = this.drawer.bindStage('mousemove', this._createCallback(eventType, callback), this.graphArea);
      this.callbackBindsTable.insertRow({eventType:eventType, shapeId:null, bindId:cbId});
    }if(eventType == 'clickbackground'){
      cbId = this.drawer.bindShape('click', this.backgroundShape, this._createCallback(eventType, callback));
      this.callbackBindsTable.insertRow({eventType:eventType, shapeId:null, bindId:cbId});
    }else{
      // determine element type from event type
      var elementType = eventType.substr(eventType.length - 4, 4);
      // get all GraphView elements of type elementType (node or edge)
      var els = this.graphViewElements.getRows({elementType:elementType});
      // for all GraphView nodes craft callback function
      for(i in els){
        this._bindToElement(eventType, els[i]['element'], this._createCallback(eventType, callback));
      }
    }

    this.userCallbacksTable.insertRow({eventType:eventType, callback:this._createCallback(eventType, callback)});
  },

  /**
   *
   * @param opt_elementTypes
   * @private
   */
  _drawLayers: function(opt_elementTypes){
    var layers = {
          node: this.nodeLayerId,
          edge: this.edgeLayerId,
          nodeLabel: this.nodeLabelLayerId
        },
        redrawLayers = ['node', 'edge', 'nodeLabel'];

    if(typeof(opt_elementTypes) !== 'undefined') redrawLayers = opt_elementTypes;
    for(var i in redrawLayers) this.drawer.drawLayer(layers[redrawLayers[i]]);
  },

  /**
   * Bind callback to GraphView element
   * @param eventType
   * @param element
   * @param cb
   * @private
   */
  _bindToElement: function(eventType, element, cb){
    //removing last 4 characters (i.e. substring 'node' or 'edge') from event name makes it exactly the name of drawer mouse event
    var drawerEventName = eventType.substr(0, eventType.length - 4);
    var cbId = this.drawer.bindShape(drawerEventName, element.getDrawerShape(), cb);
    this.callbackBindsTable.insertRow({eventType:eventType, shapeId:element.getDrawerShapeId(), callback:cb, bindId:cbId});
  },

  /**
   * Create clone of dragged node and put it on original place
   * @param e
   * @private
   */
  _dragStartNodeHandler: function(e){
    if(this.isNodeDraggedStarted === false){
      this.isNodeDraggedStarted = true;

      this.currentDraggedShapeId = e.targetNode.getId();
      this.draggedElement = this.graphViewElements.getRows({elementType:'node', drawerShapeId:this.currentDraggedShapeId})[0]['element'];
      this.draggedModelElement = this.findModelElementByShapeId(this.draggedElement.getDrawerShapeId());
      // create clone and set moving node semi-transparent
      if(this.dragMode == 'copy'){
        var el = this._cloneElement(this.currentDraggedShapeId);
        el.setXY(this.nodeMapping.mapping[el.getElementId()].x, this.nodeMapping.mapping[el.getElementId()].y);
        e.targetNode.setOpacity(0.6);
      }
    }
  },

  _draggingNodeHandler: function(e){
    if(this.isNodeDraggedStarted && this.dragMode == 'move'){
      var rows, i;
      // update accordingly moving node label and adjacent edges
      for(i in model.edges){
        if(model.edges[i].source == this.draggedModelElement['id']){
          rows = this.graphViewElements.getRows({'elementType':'edge', 'elementId':model.edges[i].id});
          rows[0]['element'].setStart({x:node.getX(), y:node.getY()});
        }
        if(model.edges[i].target == this.draggedModelElement['id']){
          rows = this.graphViewElements.getRows({'elementType':'edge', 'elementId':model.edges[i].id});
          rows[0]['element'].setStop({x:node.getX(), y:node.getY()});
        }
      }
    }
  },

  /**
   * Remove dragged node and fill in this.droppedOnShapeIds
   * @param e
   * @private
   */
  _dragEndNodeHandler: function(e){
    // calculate variables for callback args
    if(this.isNodeDraggedStarted === true){
      this.isNodeDraggedStarted = false;

      if(this.dragMode == 'copy'){
        // get all shapes the node was dropped on
        var shapes = this.drawer.getIntersections(e.layerX, e.layerY);
        this.droppedOnShapeIds = [];
        for(var i in shapes){
          // if we have found something this it is not the node we dragged - it is the element we dropped node on
          if(shapes[i].getId() != this.currentDraggedShapeId){
            this.droppedOnShapeIds.push(shapes[i].getId());
          }
        }
      }
    }

    if(this.dragMode == 'copy'){
      // remove dragged node after all callbacks was called
      this.dragendCallbackCallsCount++;
      if(this.dragendCallbackCallsCount == this.callbackBindsTable.getRowsCount({eventType:'dragendnode', shapeId:this.currentDraggedShapeId})){
        this.dragendCallbackCallsCount = 0;
        this._removeElement(e.targetNode.getId());
        this.drawer.drawLayer(this.nodeLayerId);
      }
    }
  },

  /**
   * Wrap external callback with a function that parse Drawer events (which contain shapes)
   * to a nice set of arguments to pass (which contains graph nodes and edges instead)
   * Also call helper functions to clear canvas after action where it is necessary (_dragEndNodeHandler).
   * @param eventType
   * @param callback
   * @returns {*}
   * @private
   */
  _createCallback: function(eventType, callback){
    var that = this, cb;
    if(eventType == "dragendnode"){
      cb = function(e){
        callback({
          eventType: eventType,
          fromGraphId: that.draggedElement.getGraphId(),
          draggedModelElement: that.draggedModelElement,
          droppedOnShapeIds: that.droppedOnShapeIds
        });
        that._dragEndNodeHandler(e);
      }
    }else if(eventType == "mousemove"){
      cb = function(e){
        callback({graphId: that.graphId, eventType: "mousemove", x: e.x, y: e.y});
      };
    }else if(eventType == "draggingnode"){
      cb = function(e){
        if(that.isNodeDraggedStarted) callback({
          graphId: that.draggedElement.getGraphId(),
          draggedModelElement: that.draggedModelElement,
          eventType: "draggingnode",
          x: e.x,
          y: e.y
        });
      };
    }else if(eventType == "clickbackground"){
      cb = function(e){
        callback({graphId: that.graphId, eventType:eventType, x: e.pageX, y: e.pageY});
      };
    }else if(this.eventTypes.indexOf(eventType) != -1){
      cb = function(e){
        //call binded callback
        var modelElement = that.findModelElementByShapeId(e.targetNode.getId());
        callback({graphId: that.graphId, eventType: eventType, elementType:modelElement.type, element: modelElement.element});
      };
    }

    return cb;
  },

  /**
   * This method takes drawer shape id and try to find correspondent model element.
   * Once found it returns model element and its type in a form
   * {'type':'node', element: graphModelNode} or {'type':'edge', element: graphModelEdge}.
   * Otherwise returns false
   * @param shapeId
   * @return {*}
   */
  findModelElementByShapeId: function(shapeId){
    var rows = this.graphViewElements.getRows({drawerShapeId:shapeId});
    if(rows.length > 0){
      if(rows[0]['elementType'] == 'edge') return {type:'edge', element:this.model.edges[rows[0]['elementId']]};
      if(rows[0]['elementType'] == 'node') return {type:'node', element:this.model.nodes[rows[0]['elementId']]};
      if(rows[0]['elementType'] == 'nodeLabel') return {type:'nodeLabel', element:this.model.nodes[rows[0]['elementId']]};
    }else if(shapeId === this.backgroundShape.getId()){
      return {type: 'background'};
    }else{
      return false;
    }
  },

  /**
   * Get area that is occupied by text on a canvas in a form {width:w, height:h}
   * @param text - text which size should be measured
   * @param size - double from 0 to 100
   * @return {Object}
   */
  getTextArea: function(text, size){
    var label = this.labelFactory.create(this.skin, {
      nodeLabelId: 1,
      text: text,
      graphId: this.graphId,
      x: 0,
      y: 0,
      angle: 0,
      size: size,
      opacity: 1
    },
    this.drawer
    );
    result = {width:label.getDrawerShapeWidth(), height:label.getDrawerShapeHeight()};
    label.remove();

    return result;
  },

  /**
   * Clone GraphView element and add it to canvas
   * @param shapeId - id of shape that corresponds to element we want to clone
   * @return id of clone element
   * @private
   */
  _cloneElement: function(shapeId){
    //clone element
    var clone = this.graphViewElements.getRows({drawerShapeId:shapeId})[0]['element'].clone();
    this.drawer.addShape(this.nodeLayerId, clone.getDrawerShape());
    this.drawer.drawLayer(this.nodeLayerId);

    //insert it to our elements list
    this.graphViewElements.insertRow({element:clone, elementType:clone.getElementType(), elementId:clone.getElementId(), drawerShapeId:clone.getDrawerShapeId()});

    //bind all callback from original element
    var rows = this.callbackBindsTable.getRows({shapeId:shapeId});
    for(var i in rows){
      this._bindToElement(rows[i]['eventType'], clone, rows[i]['callback']);
    }
    return clone;
  },

  /**
   * Remove GraphView element and all its binding
   * @param shapeId
   * @private
   */
  _removeElement: function(shapeId){
    // unbind all callbacks from element
    var i, rows = this.callbackBindsTable.getRows({shapeId: shapeId});
    for(i in rows){
      this.drawer.unbindShape(rows[i]['bindId']);
    }

    // remove shape
    rows = this.graphViewElements.getRows({drawerShapeId:shapeId});
    rows[0]['element'].remove();

    // remove element from the list of elements
    this.graphViewElements.removeRows({drawerShapeId:shapeId});
  }
};
