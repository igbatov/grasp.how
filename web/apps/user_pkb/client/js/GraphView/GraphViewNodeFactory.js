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
   * @param c
   * @returns {skin.skin.node.constructor}
   */
  create: function(skin, c){
    return new skin.skin.node.constructor(
      new YOVALUE.GraphViewElement({graphId:c.graphId, elementId:c.nodeId, elementType:'node'}),
      YOVALUE.extend(skin.skin.node.attr, c)
    );
  }
};
