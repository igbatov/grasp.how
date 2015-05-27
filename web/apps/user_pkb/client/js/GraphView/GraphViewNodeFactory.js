/**
 * This module creates objects with IGraphViewNode interface
 * @constructor
 */
YOVALUE.GraphViewNodeFactory = function(){};

YOVALUE.GraphViewNodeFactory.prototype = {
  create: function(skin, c){
    return new skin.skin.node.constructor(
      new YOVALUE.GraphViewElement({graphId:c.graphId, elementId:c.nodeId, elementType:'node'}),
      YOVALUE.extend(skin.skin.node.attr, c)
    );
  }
};
