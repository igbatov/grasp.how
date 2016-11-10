/**
 * Constructs drawer shape for graph node.
 * Implements IGraphViewNode interface so that GraphView knows how to work with it.
 * @param args - {nodeId, nodeType, graphId, x, y, size, color, opacity, stickers} merged with skin.node.attr definitions
 * @constructor
 */
YOVALUE.GraphViewNode = function(drawer, graphViewElement, args){
  this.stickers = args.stickers; // definition of stickers pictures in a form {'stickerName':<svg xml>, ...}
  this.drawer = drawer;
  this.graphViewElement = graphViewElement;
  YOVALUE.mixin(graphViewElement, this);

  this.shape = this.drawer.createGroup({
    x: args.x,
    y: args.y,
    opacity: args.opacity,
    draggable: true
  });

  this.circle = this.drawer.createShape('circle', {
    x: 0,
    y: 0,
    radius: args.size,
    fill: args.color,
    stroke: args.color,
    strokeWidth: 1
  });
  this.shape.add(this.circle);

  this.setStickers(args.stickers);

  graphViewElement.setDrawerShape(this.shape);
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
    if(v != this.circle.getRadius()){
      this.circle.setRadius(v);
    }
  },

  getSize: function(){
    return this.circle.getRadius();
  },

  setColor: function(color){
    if(color != this.circle.getFill()){
      this.circle.setFill(color);
      this.circle.setStroke(color);
    }
  },

  getStickers: function(){
    return this.stickers;
  },

  setStickers: function(v){
    if(YOVALUE.typeof(v) != 'object') return;
    // remove all old stickers
    var chs = YOVALUE.getObjectKeys(this.shape.getChildren());
    for(var i in chs) if(chs[i] != this.circle.getShape().id) this.shape.remove(chs[i]);
    // add new stickers
    var nodeSize = 2*this.getSize();
    var cnt = 0; // position icon according its number from left-top to right bottom, left to right
    for(var i in v){
      // we cannot position more than 4 stickers
      if(cnt > 3) continue;
      var sticker = this.drawer.createShape('svg', {
        svgxml:v[i]
      });
      if(cnt == 0) sticker.setX(Number(-nodeSize)); sticker.setY(Number(-nodeSize));
      if(cnt == 1) sticker.setX(Number(-nodeSize)); sticker.setY(0);
      if(cnt == 2) sticker.setX(0); sticker.setY(Number(-nodeSize));
      if(cnt == 3) sticker.setX(0); sticker.setY(0);
      cnt++;
      this.shape.add(sticker);
    }
    this.stickers = v;
    return true;
  },

  getIcon: function(){
    return null;
  },

  setIcon: function(){
    return true;
  },

  getColor: function(){
    return this.circle.getFill();
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
      this.drawer,
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