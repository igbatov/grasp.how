/**
 * Interface for Drawer and SVGDrawer
 * @type {Object}
 */
YOVALUE.iDrawer = {
  /**
   * Adds layer
   * All shapes lie in a layer
   * Union of all layers is a stage
   * @param layer_id
   */
  addLayer: function(layer_id){},
  removeLayer: function(layer_id){},
  drawLayer: function(layer_id){},



  /**
   * Hide layer
   * @param layer_id
   */
  hideLayer: function(layer_id){},

  /**
   * Show layer
   * @param layer_id
   */
  showLayer: function(layer_id){},

  /**
   * Adds shape to the layer
   * @param layer_id
   * @param shape
   */
  addShape: function(layer_id, shape){},

  /**
   * Bind callback to shape event
   * @param eventType - one of this names ['click', 'dblclick', 'mouseenter', 'mouseleave', 'dragstart', 'dragend']
   * @param shape
   * @param callback
   * @return {Number} - bindId which can be used later in unbindShape
   */
  bindShape: function(eventType, shape, callback){},
  unbindShape: function(bindId){},
  muteShape: function(shapeId, mute){},

  /**
   * Bind 'mousemove' to stage
   * @param eventType
   * @param callback
   * @param area - {centerX:x, centerY:y, width:w, height:h} is area of stage for mousemove event.
   * Example: {centerX:10, centerY:10, width:5, height:5} means a rectangle with center
   * positioned 10 pixels to the right and 10 to bottom from left top corner of stage.
   * @return callbackId - id of callback that can be used later in unbindStage to unbind this callback
   */
  bindStage: function(eventType, callback, area){},
  unbindStage: function(bindId){},
  muteStage: function(bindId, mute){},

  /**
   * Get all shapes that have (x,y) point
   * @param x
   * @param y
   * @return {*}
   */
  getIntersections: function(x,y){}
};

/**
 * Rectangle
 * @constructor
 */
YOVALUE.iDrawer.Rect = {
  getId: function(){},

  setX: function(v){},
  getX: function(){},
  setY: function(v){},
  getY: function(){},

  setGraggable: function(v){},
  getGraggable: function(){},

  setWidth: function(v){},
  getWidth: function(){},
  setHeight: function(v){},
  getHeight: function(){},

  setOpacity: function(v){},
  getOpacity: function(){},

  setFill: function(v){},
  getFill: function(){},

  setStroke: function(v){},
  getStroke: function(){},

  setStrokeWidth: function(v){},
  getStrokeWidth: function(){},

  remove: function(){}
};

/**
 * Path
 * @param args
 * @constructor
 */
YOVALUE.iDrawer.Path = {
  getId: function(){},

  setData: function(v){},
  getData: function(){},

  setGraggable: function(v){},
  getGraggable: function(){},

  setOpacity: function(v){},
  getOpacity: function(){},

  setStroke: function(v){},
  getStroke: function(){},

  setStrokeWidth: function(v){},
  getStrokeWidth: function(){}
};

/**
 * Circle
 * @param args
 * @constructor
 */
YOVALUE.iDrawer.Circle = {
  getId: function(){},

  setX: function(v){},
  getX: function(){},
  setY: function(v){},
  getY: function(){},

  setRadius: function(v){},
  getRadius: function(){},

  setGraggable: function(v){},
  getGraggable: function(){},

  setOpacity: function(v){},
  getOpacity: function(){},

  setStroke: function(v){},
  getStroke: function(){},

  setStrokeWidth: function(v){},
  getStrokeWidth: function(){}
};

/**
 * Text
 * @param args
 * @constructor
 */
YOVALUE.iDrawer.Text = {
  getId: function(){},

  setX: function(v){},
  getX: function(){},
  setY: function(v){},
  getY: function(){},

  setText: function(v){},
  getText: function(){},

  setFontSize: function(v){},
  getFontSize: function(){},

  setFontFamily: function(v){},
  getFontFamily: function(){},

  setGraggable: function(v){},
  getGraggable: function(){},

  setOpacity: function(v){},
  getOpacity: function(){},

  setFill: function(v){},
  getFill: function(){}
};
