/**
 * This module creates objects with IGraphViewEdge interface
 * @constructor
 */
YOVALUE.GraphViewEdgeFactory = function(){};

YOVALUE.GraphViewEdgeFactory.prototype = {
  create: function(skin, c){
    return new skin.skin.edge.constructor(
      new YOVALUE.GraphViewElement({graphId:c.graphId, elementId:c.edgeId, elementType:'edge'}),
      YOVALUE.extend(skin.skin.edge.attr, c)
    );
  }
};
