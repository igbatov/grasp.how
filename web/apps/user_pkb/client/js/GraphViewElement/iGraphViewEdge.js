/**
 * Interface that GraphView expects from object created by graphViewEdgeFactory
 * @param args
 * @constructor
 */
YOVALUE.iGraphViewEdge = {
  getCanvasDrawerShape: function(){},
  getElementType: function(){},
  getElementId: function(){},
  getGraphId: function(){},
  setEdgeType: function(type){},
  getEdgeType: function(){},
  setStart: function(x,y){},
  getStart: function(){},
  setStop: function(x,y){},
  getStop: function(){},
  getOpacity: function(){},
  setOpacity: function(v){}
}