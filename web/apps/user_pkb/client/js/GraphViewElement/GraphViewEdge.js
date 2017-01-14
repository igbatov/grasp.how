/**
 * Constructs shape for graph edge.
 * Implements IGraphViewEdge interface so that GraphView knows how to work with it.
 * @param drawer
 * @param graphViewElement
 * @param args - {color, edgeId, edgeType, start, stop, opacity, direction} + skin.edge.attr
 * @constructor
 */
GRASP.GraphViewEdge = function(drawer, graphViewElement, args){
  this.start =  args.start;
  this.stop =  args.stop;
  this.edgeType = args.edgeType;
  this.width = args.width == 1 || typeof(args.width) == 'undefined' ? null : args.width;
  this.sourceNodeRadius = args.sourceNodeRadius;
  this.targetNodeRadius = args.targetNodeRadius;
  this.drawer = drawer;
  this.typeDirection = args.typeDirection;
  this.directionType = args.typeDirection[this.edgeType];

  this.graphViewElement = graphViewElement;
  GRASP.mixin(graphViewElement, this);

  this.shape = this.drawer.createShape('path', {
    data: this._getQuadPathData(this.start, this.stop, this.directionType,this.sourceNodeRadius, this.targetNodeRadius),
    //hitData: this._getQuadPathData(args.start, args.stop, 10),
    stroke: args.color,
    opacity: args.opacity,
    width: this.width,
    fill: 'transparent'
  });

  this.setWidth(this.width);

  graphViewElement.setDrawerShape(this.shape);
  this.setEdgeType(this.edgeType);
};

GRASP.GraphViewEdge.prototype = {
  remove: function(){
    this.graphViewElement.remove();
    delete this;
  },

  getEdgeType: function(){
    return this.edgeType;
  },
  setEdgeType: function(edgeType){
    this.edgeType = edgeType;
    this.directionType = this.typeDirection[edgeType];
    if(this.directionType == 'uni'){
      this.drawer.createMarker("marker_"+this.edgeType, 0.6, this.getColor());
      this.shape.setMarkerEnd("url(#marker_"+this.edgeType+")");
    }
    else this.shape.setMarkerEnd("");
  },

  /**
   *
   * @param point - {x:x, y:y}
   */
  setStart: function(point){
    if(this.start != point){
      this.start = point;
      var pathData = this._getQuadPathData(this.start, this.stop, this.directionType, null, this.sourceNodeRadius,this.targetNodeRadius);
      this.shape.setData(pathData);
    }
  },
  /**
   *
   * @param point - {x:x, y:y}
   */
  setStop: function(point){
    if(this.stop != point){
      this.stop = point;
      var pathData = this._getQuadPathData(this.start, this.stop, this.directionType, null, this.sourceNodeRadius,this.targetNodeRadius);
      this.shape.setData(pathData);
    }
  },

  getStart: function(){
    return this.start;
  },
  getStop: function(){
    return this.stop;
  },

  setColor: function(color){
    if(color != this.shape.getStroke()){
      this.shape.setStroke(color);
    }
  },
  getColor: function(){
    return this.shape.getStroke();
  },

  setWidth: function(w){
    this.width = w;
    return this.shape.setStrokeWidth(Math.max(1, w));
  },
  getWidth: function(w){
    return this.width;
  },

  setSourceNodeRadius: function(v){
    this.sourceNodeRadius = v;
    var pathData = this._getQuadPathData(this.start, this.stop, this.directionType, null, this.sourceNodeRadius,this.targetNodeRadius);
    this.shape.setData(pathData);
  },
  getSourceNodeRadius: function(){
    return this.sourceNodeRadius;
  },

  setTargetNodeRadius: function(v){
    this.targetNodeRadius = v;
    var pathData = this._getQuadPathData(this.start, this.stop, this.directionType, null, this.sourceNodeRadius,this.targetNodeRadius);
    this.shape.setData(pathData);
  },
  getTargetNodeRadius: function(){
    return this.targetNodeRadius;
  },

  /**
   * Return area that is bordered by quadratic line starting at start param, ending at stop param.
   * @param start
   * @param stop
   * @param directionType - bi-directional on uni-directional
   * @param {number=} opt_startOffset - distance from start node center to start node border
   * @param {number=} opt_stopOffset - distance from stop node center to stop node border
   * @return {*}
   * @private
   */
  _getQuadPathData: function (start, stop, directionType, opt_startOffset, opt_stopOffset){
    var path, delim = " ";
    var CURV = "Q";

    //perpendicular
    var p = {x:-(stop.y-start.y)/4, y:(stop.x-start.x)/4};
    var middle = {x:(start.x+(stop.x-start.x)/2 + p.x), y:(start.y+(stop.y-start.y)/2 + p.y)};

    // for uni-direction: add circle at the edge and circle intersection
    if(directionType == 'uni' && (typeof(opt_stopOffset) != 'undefined' && opt_stopOffset>0)){
      // get intersection of stop circle and tangent line
      var mv = {x:(middle.x-stop.x), y:(middle.y-stop.y)};
      var mvLength = Math.sqrt(Math.pow(mv.x,2) + Math.pow(mv.y,2));
      mv.x = mv.x/mvLength; mv.y = mv.y/mvLength;
      var stopx = stop.x+opt_stopOffset*mv.x, stopy = stop.y+opt_stopOffset*mv.y;
    }else{
      stopx = stop.x;
      stopy = stop.y;
    }

    path = "M " + Math.round(start.x) + delim + Math.round(start.y)
        + delim + CURV + " " + Math.round(middle.x) + delim + Math.round(middle.y)
        + delim + Math.round(stopx) + delim + Math.round(stopy);

    return path;
  },

  polarToCartesian: function (centerX, centerY, radius, angleInDegrees) {
    var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;

    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  },

  describeArc: function (x, y, radius, startAngle, endAngle){
    var start = this.polarToCartesian(x, y, radius, endAngle);
    var end = this.polarToCartesian(x, y, radius, startAngle);

    var arcSweep = endAngle - startAngle <= 180 ? "0" : "1";

    var d = [
      "M", start.x, start.y,
      "A", radius, radius, 0, arcSweep, 0, end.x, end.y
    ].join(" ");

    return d;
  }
};
