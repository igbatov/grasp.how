/**
 * This module creates objects with IGraphViewNodeLabel interface
 * @constructor
 */
YOVALUE.GraphViewNodeLabelFactory = function(){};

YOVALUE.GraphViewNodeLabelFactory.prototype = {
  create: function(skin, c){
    return new skin.skin.nodeLabel.constructor(
      new YOVALUE.GraphViewElement({graphId:c.graphId, elementId:c.nodeLabelId, elementType:'nodeLabel'}),
      YOVALUE.extend(skin.skin.nodeLabel.attr, c)
    );
  }
};
