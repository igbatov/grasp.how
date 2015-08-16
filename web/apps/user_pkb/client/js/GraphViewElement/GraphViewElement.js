/**
 * Constructs canvasDrawer shape for graph node.
 * Implements IGraphViewNode interface so that GraphView knows how to work with it.
 * @param args - {elementId, elementType, graphId}
 * @constructor
 */
YOVALUE.GraphViewElement = function(args){
  this.graphId = args.graphId;
  this.elementId = args.elementId;
  this.elementType = args.elementType;
};

YOVALUE.GraphViewElement.prototype = {
  setCanvasDrawerShape: function(shape){
    this.shape = shape;
    this.shape.setId(shape._id);
  },

  getCanvasDrawerShape: function(){
    return this.shape;
  },

  getCanvasDrawerShapeWidth: function(){
    return this.shape.getWidth();
  },

  getCanvasDrawerShapeHeight: function(){
    return this.shape.getHeight();
  },

  getCanvasDrawerShapeId: function(){
    return this.shape.getId();
  },

  remove: function(){
    this.shape.remove();
    delete this;
  },

  getElementType: function(){
    return this.elementType;
  },

  getElementId: function (){
    return this.elementId;
  },

  getGraphId: function (){
    return this.graphId;
  },

  setOpacity: function(v){
    if(v != this.shape.getOpacity()) this.shape.setOpacity(v);
  },

  getOpacity: function(){
    return this.shape.getOpacity();
  }
};