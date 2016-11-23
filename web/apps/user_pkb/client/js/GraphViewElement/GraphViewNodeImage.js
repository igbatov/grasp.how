/**
 * Constructs canvasDrawer shape for graph node.
 * Implements IGraphViewNode interface so that GraphView knows how to work with it.
 * @param args - {nodeId, nodeType, graphId, x, y, size, color, opacity, stickers} merged with skin.node.attr definitions
 * @constructor
 */
GRASP.GraphViewNodeImage = function(drawer, graphViewElement, args){
  this.stickers = args.stickers; // definition of stickers pictures in a form {'stickerName':<svg picture>, ...}
  this.drawer = drawer;

  this.graphViewElement = graphViewElement;
  GRASP.mixin(graphViewElement, this);

  this.args = args;
  this.image = this.getIconImage(args.icon, args.color);

  this.shape = this.drawer.createShape('image', {
    x: args.x,
    y: args.y,
    image: this.image,
    width: 0,
    height: 0,
    draggable: true
  });

  //set original values, so we can use it later in image processing
  this.color = args.color;
  this.x = args.x;
  this.y = args.y;

  this.size = args.size;
  this.graphViewElement.setDrawerShape(this.shape);

  var dim = this.convertSizeToDim(args.size, this.image.width, this.image.height);
  this.shape.setSize(dim);
  this.shape.setOpacity(args.opacity);
  this.shape.setX(args.x - dim.width/2);
  this.shape.setY(args.y - dim.height/2);
  graphViewElement.setDrawerShape(this.shape);
};

GRASP.GraphViewNodeImage.prototype = {
  getIconImage: function(icon, color){
    if(icon == null){
      var src = "data:image/png;base64,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";
      icon = new Image();
      icon.src = GRASP.changeColorInImage(src, '#FFFFFF', color);
    }
    return icon;
  },

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

  setIcon: function(icon){
    if(this.args.icon != icon){
      this.shape.setImage(this.getIconImage(icon, this.color));
      this.args.icon = icon;
    }
  },

  getIcon: function(){
    return  this.args.icon;
  },

  setSize: function(v){
    if(v != this.size){
      var k = v/this.size;
      this.size = v;

      this.shape.setSize({width: k*this.shape.getWidth(), height: k*this.shape.getHeight()});
      this.shape.setX(this.x - this.shape.getWidth()/2);
      this.shape.setY(this.y - this.shape.getHeight()/2);
    }
  },

  getSize: function(){
    return this.size;
  },


  setColor: function(color){
    // if this is image of plain color setted in constructor (i.e. not user icon)
    if(this.image.src.substr(1, 10) == 'data:image') this.image.src = GRASP.changeColorInImage(this.image.src, this.color, color);
    this.color = color;
  },

  getColor: function(){
    return this.color;
  },

  setXY: function(x,y){
    this.x = x;
    this.y = y;

    x = x - this.shape.getWidth()/2;
    y = y - this.shape.getHeight()/2;

    if(x != this.shape.getX()) this.shape.setX(x);
    if(y != this.shape.getY()) this.shape.setY(y);
  },

  getXY: function(){
    return {x:this.x, y:this.y};
  },

  clone: function (){
    return new GRASP.GraphViewNodeImage(
      new GRASP.GraphViewElement({graphId:this.getGraphId(), elementId:this.getElementId(), elementType:'node'}),
      {
        nodeId: this.getElementId(),
        nodeType: this.getNodeType(),
        icon: this.getIcon(),
        graphId: this.getGraphId(),
        x: this.getXY().x,
        y: this.getXY().y,
        size: this.size,
        color: this.getColor(),
        opacity: this.getOpacity()
      }
    );
  },

  convertSizeToDim: function(size, w, h){
    var k = h/w;
    var newW = 2*size/Math.sqrt(1+k*k);
    var newH = newW*k;
    return {width:2*parseInt(newW), height:2*parseInt(newH)};
  }
};