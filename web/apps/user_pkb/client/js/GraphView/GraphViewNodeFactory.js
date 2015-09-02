/**
 * This module creates objects with IGraphViewNode interface
 * @constructor
 */
YOVALUE.GraphViewNodeFactory = function(){};

YOVALUE.GraphViewNodeFactory.prototype = {
  /**
   *
   * @param skin in form {
      node:{
        constructor: YOVALUE.GraphViewNode,
        attr: {}
      },
      edge:{
        constructor: YOVALUE.GraphViewEdge,
        attr: {}
      },
      nodeLabel:{
        constructor: YOVALUE.GraphViewNodeLabel,
        attr: {'font':'Calibri', fill:'#BBBBBB', maxSize: 24}
      }
    }
   * @param node settings
   * @returns {YOVALUE.iGraphViewNode}
   */
  create: function(skin, node){
    var constructor;

    if(node.icon == null || typeof(node.icon) == 'undefined') constructor = skin.skin.node.constructor.withoutIcon;
    else constructor = skin.skin.node.constructor.withIcon;

    return new constructor(
      new YOVALUE.GraphViewElement({graphId:node.graphId, elementId:node.nodeId, elementType:'node'}),
      YOVALUE.extend(skin.skin.node.attr, node)
    );
  }
};
