/**
 * This module creates objects with IGraphViewEdge interface
 * @constructor
 */
YOVALUE.GraphViewEdgeFactory = function(){};

YOVALUE.GraphViewEdgeFactory.prototype = {
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
   * @returns {skin.edge.constr}
   */
  create: function(skin, c){
    return new skin.edge.constr(
      new YOVALUE.GraphViewElement({graphId:c.graphId, elementId:c.edgeId, elementType:'edge'}),
      YOVALUE.extend(skin.edge.attr, c)
    );
  }
};
