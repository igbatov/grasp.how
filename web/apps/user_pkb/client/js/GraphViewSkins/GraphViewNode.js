/**
 * Constructs canvasDrawer shape for graph node.
 * Implements IGraphViewNode interface so that GraphView knows how to work with it.
 * @param args - {nodeId, nodeType, graphId, x, y, size, color, opacity}
 * @constructor
 */
YOVALUE.GraphViewNode = function(graphViewElement, args){
  this.nodeType = args.nodeType;

  this.graphViewElement = graphViewElement;
  YOVALUE.mixin(graphViewElement, this);

  this.shape = new YOVALUE.CanvasDrawer.Circle({
    x: args.x,
    y: args.y,
    radius: args.size,
    fill: args.color,
    stroke: args.color,
    strokeWidth: 1,
    opacity: args.opacity,
    draggable: true
  });

  graphViewElement.setCanvasDrawerShape(this.shape);
};

YOVALUE.GraphViewNode.prototype = {
  remove: function(){
    this.graphViewElement.remove();
    delete this;
  },

  getNodeType: function (){
    return this.nodeType;
  },

  setNodeType: function (v){
    this.nodeType = v;
  },

  setSize: function(v){
    if(v != this.shape.getRadius()){
      this.shape.setRadius(v);
    }
  },

  getSize: function(){
    return this.shape.getRadius();
  },

  setColor: function(color){
    if(color != this.shape.getFill()){
      this.shape.setFill(color);
      this.shape.setStroke(color);
    }
  },

  getIcon: function(){
    return null;
  },

  setIcon: function(){
    return true;
  },

  getColor: function(){
    return this.shape.getFill();
  },

  setXY: function(x,y){
    if(x != this.shape.getX()) this.shape.setX(x);
    if(y != this.shape.getY()) this.shape.setY(y);
  },

  getXY: function(){
    return {x:this.shape.getX(),y:this.shape.getY()};
  },

  clone: function (){
    return new YOVALUE.GraphViewNode(
      new YOVALUE.GraphViewElement({graphId:this.getGraphId(), elementId:this.getElementId(), elementType:'node'}),
      {
        nodeId: this.getElementId(),
        nodeType: this.getNodeType(),
        graphId: this.getGraphId(),
        x: this.getXY().x,
        y: this.getXY().y,
        size: this.getSize(),
        color: this.getColor(),
        opacity: this.getOpacity()
      }
    );
  }
};