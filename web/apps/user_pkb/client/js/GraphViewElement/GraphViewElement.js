/**
 * Constructs base shape for graph node.
 * @param args - {elementId, elementType, graphId}
 * @constructor
 */
YOVALUE.GraphViewElement = function(args){
  this.graphId = args.graphId;
  this.elementId = args.elementId;
  this.elementType = args.elementType;
};

YOVALUE.GraphViewElement.prototype = {
  setDrawerShape: function(shape){
    this.shape = shape;
    this.shape.setId(shape._id);
  },

  getDrawerShape: function(){
    return this.shape;
  },

  getDrawerShapeWidth: function(){
    return this.shape.getWidth();
  },

  getDrawerShapeHeight: function(){
    return this.shape.getHeight();
  },

  getDrawerShapeId: function(){
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