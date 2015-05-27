/**
 * The role of CanvasDrawer is to provide basic graphical framework for GraphView in a form of iCanvasDrawer interface.
 * This CanvasDrawer is just an adapter of KineticJS framework (http://www.kineticjs.com/)
 * @param kinetic
 * @param stageContainerId
 * @param stageContainerWidth
 * @param stageContainerHeight
 * @param jQuery
 * @constructor
 */
YOVALUE.CanvasDrawer = function(kinetic, stageContainerId, stageContainerWidth, stageContainerHeight, jQuery){
  this.kinetic = kinetic;
  this.stageContainerId = stageContainerId;
  this.stageContainerWidth = stageContainerWidth;
  this.stageContainerHeight = stageContainerHeight;
  this.jQuery = jQuery;

  //creating stage - main container for all layers
  this.stage = new this.kinetic.Stage({
    container: stageContainerId,
    width: stageContainerWidth,
    height: stageContainerHeight
  });

  //array of layers
  this.layers = [];
  //array of shapes
  this.shapes = [];

  //hash of callbacks binded on stage: key - id of callback, value - event type name
  this.stageCallbacks = [];
  //hash of shape callbacks: key - id of callback, value - layer id
  this.bindedShapes = [];
};

YOVALUE.CanvasDrawer.prototype = {
  /**
   *
   * @param layer_name - string
   * @return {Number}
   */
  addLayer: function(layer_name){
    var layer = new this.kinetic.Layer({id:this.layers.length}), that = this;
    layer.setAttr("layer_name", layer_name);
    this.stage.add(layer);
    this.layers.push(layer);
    return this.layers.length-1;
  },

  getLayerIdByName: function(name){
    var i;
    for(i in this.layers){
      if(this.layers[i].getAttr('layer_name') === name) return i;
    }
    return false;
  },

  drawLayer: function(layer_id){
    this.layers[layer_id].draw();
  },

  removeLayer: function(layer_id){
    this.layers[layer_id].remove();
  },

  addShape: function(layer_id, shape){
    this.layers[layer_id].add(shape);
    this.shapes[shape.getId()] = shape;
  },

  getStageDataUrl: function(mimeType,callback){
    return this.stage.toDataURL({mimeType:mimeType, callback:callback});
  },

  getLayerDataUrl: function(layer_id,mimeType){
    return this.layers[layer_id].toDataURL(mimeType);
  },

  getLayerImageData: function(layer_id){
    var ctx = this.layers[layer_id].getContext();
    return ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height);
  },

  getShape: function(id){
    return this.shapes[id];
  },

  /**
   * Bind callback to eventType of stage container using jquery. For now the eventType can be ony 'mousemove'
   * @param eventType
   * @param callback
   * @param area - {centerX:x, centerY:y, width:w, height:h} is area of stage for mousemove event.
   * Example: {centerX:10, centerY:10, width:5, height:5} means a rectangle with center
   * positioned 10 pixels to the right and 10 to bottom from left top corner of stage.
   * @return callbackId - id of callback that can be used later in unbindStage to unbind this callback
   */
  bindStage: function(eventType, callback, area){
    if(eventType != "mousemove") return false;

    var that = this,
      x1 = area.centerX - area.width/ 2,
      x2 = area.centerX  + area.width/ 2,
      y1 = area.centerY - area.height/ 2,
      y2 = area.centerY + area.height/2;
    this.stageCallbacks[this.stageCallbacks.length] = function(e){
      var relX = e.clientX - that.stage.getContent().getBoundingClientRect().left;
      var relY = e.clientY - that.stage.getContent().getBoundingClientRect().top;
      if( relX > x1 && relX < x2 && relY > y1 && relY < y2){
        callback({x:relX, y:relY});
      }
    };
    var callbackId = this.stageCallbacks.length - 1;
    this.jQuery(this.stage.getContainer()).bind('mousemove', this.stageCallbacks[callbackId]);
    return callbackId;
  },

  unbindStage: function(bindId){
    this.jQuery(this.stage.getContainer()).unbind('mousemove', this.stageCallbacks[bindId]);
    delete this.stageCallbacks[bindId];
  },

  /**
   *
   * @param bindId
   * @param {Boolean=} unMute
   */
  muteStage: function(bindId, mute){
    if(mute == true) this.jQuery(this.stage.getContainer()).unbind('mousemove', this.stageCallbacks[bindId]);
    else this.jQuery(this.stage.getContainer()).bind('mousemove', this.stageCallbacks[bindId]);
  },

  /**
   * Bind callback to shape event
   * @param eventType - one of this names ['click', 'dblclick', 'mouseenter', 'mouseleave', 'dragstart', 'dragend']
   * @param shape
   * @param callback
   * @return {Number} - bindId which can be used later in unbindShape
   */
  bindShape: function(eventType, shape, callback){
    this.bindedShapes.push(shape.getId());
    var callbackId = this.bindedShapes.length - 1;
    shape.setListening(true);
    // Kinetic event bind engine do not need named function to unbind it later.
    // Instead it use namespaces in form eventName.namespaceName
    shape.on(eventType+"."+callbackId, callback);
    return callbackId;
  },

  /**
   * unbind callback on shape by bindId returned from bindShape
   * @param bindId
   */
  unbindShape: function(bindId){
    this.shapes[this.bindedShapes[bindId]].off('.'+bindId);
    delete this.bindedShapes[bindId];
  },

  muteShape: function(shapeId, mute){
    var shape = this.shapes[shapeId];
    if(mute) shape.setListening(false);
    else shape.setListening(true);
  },

  /**
   * get all shapes that have (x,y) point
   * @param x
   * @param y
   * @return {*}
   */
  getIntersections: function(x,y){
    //TODO: it seems that kinetic4.5.5 getAllIntersections has bug dealing with text intersection
    return this.stage.getAllIntersections(x, y);
    /*
    var shapes = [], intersections;

    for(var i in this.layers){
      intersections = this.layers[i].getIntersection(x,y);
      if(intersections != null && typeof(intersections['shape']) != 'undefined') shapes.push(intersections['shape']);
    }
    return shapes;
    */
  },

  getStage: function(){
    return this.stage;
  },

  getStageContainerId: function(){
    return this.stageContainerId;
  },

  getStageContainerWidth: function(){
    return this.stageContainerWidth;
  },

  getStageContainerHeight: function(){
    return this.stageContainerHeight;
  },

  showLayer: function(layer_id){
    this.layers[layer_id].show();
  },

  hideLayer: function(layer_id){
    this.layers[layer_id].hide();
  }
};

/*
 * Define some basic shapes
 */
YOVALUE.CanvasDrawer.Image = Kinetic.Image;
YOVALUE.CanvasDrawer.Circle = Kinetic.Circle;
YOVALUE.CanvasDrawer.Text = Kinetic.Text;
YOVALUE.CanvasDrawer.Path = Kinetic.Path;
YOVALUE.CanvasDrawer.Rect = Kinetic.Rect;