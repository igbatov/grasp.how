/**
 * Constructs canvasDrawer shape for graph node label.
 * Implements IGraphViewNodeLabel interface so that GraphView knows how to work with it.
 * @param drawer
 * @param graphViewElement
 * @param args - {labelId, nodeType, graphId, x, y, text, size, angle, opacity}
 * @constructor
 */
GRASP.GraphViewNodeLabel = function(drawer, graphViewElement, args){
  this.drawer = drawer;
  this.graphViewElement = graphViewElement;
  GRASP.mixin(graphViewElement, this);

  this.shape = this.drawer.createShape('text', {
    x: args.x,
    y: args.y,
    text: args.text,
    fontSize: args.size,
    fontFamily: args.font,
    fill: args.fill,
    opacity: args.opacity,
    rotation: args.angle
  });

  this.maxSize = args.maxSize;

  this.drawer.muteShape(this.shape, true);

  graphViewElement.setDrawerShape(this.shape);
};

GRASP.GraphViewNodeLabel.prototype = {
  remove: function(){
    this.graphViewElement.remove();
    delete this;
  },

  setText: function(v){
    this.shape.setText(v);
  },

  getText: function(){
    return this.shape.getText();
  },

  setAngle: function(v){
    if(v != this.shape.getRotation()) this.shape.setRotation(v);
  },

  getAngle: function(){
    return this.shape.getRotation();
  },

  setSize: function(v){
    if(v != this.getSize()) this.shape.setFontSize(v);
  },

  getSize: function(){
    return this.shape.getFontSize();
  },

  setXY: function(x,y){
    if(x != this.shape.getX()) this.shape.setX(x);
    if(y != this.shape.getY()) this.shape.setY(y);
  },

  getXY: function(){
    return {x:this.shape.getX(),y:this.shape.getY()};
  }
};

