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
        constr: {'withoutIcon':YOVALUE.GraphViewNode, 'withIcon':YOVALUE.GraphViewNodeImage}
        attr: {}
      },
      edge:{
        constr: YOVALUE.GraphViewEdge,
        attr: {}
      },
      nodeLabel:{
        constr: YOVALUE.GraphViewNodeLabel,
        attr: {'font':'Calibri', fill:'#BBBBBB', maxSize: 24}
      }
    }
   * @param node settings
   * @returns {skin.node.constr}
   */
  create: function(skin, node){
    var constructor;

    if(node.icon == null || typeof(node.icon) == 'undefined') constructor = skin.node.constr.withoutIcon;
    else constructor = skin.node.constr.withIcon;

    return new constructor(
      new YOVALUE.GraphViewElement({graphId:node.graphId, elementId:node.nodeId, elementType:'node'}),
      YOVALUE.extend(skin.node.attr, node)
    );
  }
};
