/**
 * Constructs shape for graph edge.
 * Implements IGraphViewEdge interface so that GraphView knows how to work with it.
 * @param drawer
 * @param graphViewElement
 * @param args - {edgeId, edgeType, graphId, start, stop, opacity}
 * @constructor
 */
YOVALUE.GraphViewEdge = function(drawer, graphViewElement, args){
  this.start =  args.start;
  this.stop =  args.stop;
  this.edgeType = args.edgeType;
  this.width = args.width;
  this.drawer = drawer;

  this.graphViewElement = graphViewElement;
  YOVALUE.mixin(graphViewElement, this);

  this.shape = this.drawer.createShape('path', {
    data: this._getQuadPathData(args.start, args.stop),
    hitData: this._getQuadPathData(args.start, args.stop, 10),
    stroke: args.color,
    opacity: args.opacity,
    fill: 'none'
  });

  this.setWidth(this.width);

  graphViewElement.setDrawerShape(this.shape);
  this.setEdgeType(this.edgeType);
};

YOVALUE.GraphViewEdge.prototype = {
  remove: function(){
    this.graphViewElement.remove();
    delete this;
  },

  getEdgeType: function(){
    return this.edgeType;
  },

  setEdgeType: function(edgeType){
    this.edgeType = edgeType;
  },

  /**
   *
   * @param point - {x:x, y:y}
   */
  setStart: function(point){
    if(this.start != point){
      this.start = point;
      var pathData = this._getQuadPathData(this.start, this.stop);
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
      var pathData = this._getQuadPathData(this.start, this.stop);
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

  /**
   * Return area that is bordered by quadratic line starting at start param, ending at stop param.
   * @param start
   * @param stop
   * @param {number=} opt_width - width of the area in pixels, default is no width
   * @return {*}
   * @private
   */
  _getQuadPathData: function (start, stop, opt_width){
    var path, delim = " ";

    //perpendicular
    var p = {x:-(stop.y-start.y)/4, y:(stop.x-start.x)/4};
    var middle = {x:(start.x+(stop.x-start.x)/2 + p.x), y:(start.y+(stop.y-start.y)/2 + p.y)};

    if(opt_width){
      var norm = 2*Math.sqrt((p.x)*(p.x)+(p.y)*(p.y))/opt_width;

      //bottom start
      var bs = {x:(start.x-p.x/norm), y:(start.y-p.y/norm)};
      //bottom middle
      var bm = {x:(middle.x-p.x/norm), y:(middle.y-p.y/norm)};
      //bottom end
      var be = {x:(stop.x-p.x/norm), y:(stop.y-p.y/norm)};

      //up start
      var us = {x:(stop.x+p.x/norm), y:(stop.y+p.y/norm)};
      //up middle
      var um = {x:(middle.x+p.x/norm), y:(middle.y+p.y/norm)};
      //up end
      var ue = {x:(start.x+p.x/norm), y:(start.y+p.y/norm)};

      path = "M "+Math.round(bs.x)+delim+Math.round(bs.y)+delim+"Q "+Math.round(bm.x)+delim+Math.round(bm.y)+delim+Math.round(be.x)+delim+Math.round(be.y)+delim+"L "+Math.round(us.x)+delim+Math.round(us.y)+delim+"Q "+Math.round(um.x)+delim+Math.round(um.y)+delim+Math.round(ue.x)+delim+Math.round(ue.y)+delim+"Z";
    }else{
      path = "M "+Math.round(start.x)+delim+Math.round(start.y)+delim+"Q "+Math.round(middle.x)+delim+Math.round(middle.y)+delim+Math.round(stop.x)+delim+Math.round(stop.y);
    }

    return path;
  }
};
