/**
 * Constructs canvasDrawer shape for graph node label.
 * Implements IGraphViewNodeLabel interface so that GraphView knows how to work with it.
 * @param graphViewElement
 * @param args - {labelId, nodeType, graphId, x, y, text, size, angle, opacity}
 * @constructor
 */
YOVALUE.GraphViewNodeLabel = function(graphViewElement, args){
  this.graphViewElement = graphViewElement;
  YOVALUE.mixin(graphViewElement, this);

  this.shape = new YOVALUE.CanvasDrawer.Text({
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
  this.shape.setListening(false);
  graphViewElement.setCanvasDrawerShape(this.shape);
};

YOVALUE.GraphViewNodeLabel.prototype = {
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

