/**
 * We need this class because calculation of some graphViewNode attributes, such as size for example,
 * needs knowledge of the whole picture (all graph nodes count, graph area size as well as node importance)
 * and cannot be done solely by GraphViewNode on the basis of only single node characteristics and skin parameters.
 *
 * As for color  - yes, it can be set in GraphViewNode based solely on node type and skin.node.attr.typeColors
 * but for flexibility of decoration power it can also be done here too and will have precedence.
 *
 * Conversion from functional node attributes (importance, reliability)
 * to visual one (size, color, opacity, stickers) also is done here,
 * because graphViewNode should not know about functional attributes, only about visual.
 *
 * List of available stickers (if any) as well as its actual view should be defined in
 * skin.node.attr.stickers in a form {'name':{svg picture}, ...}
 *
 * @constructor
 */
GRASP.GraphDecorationByType = function(){

};


GRASP.GraphDecorationByType.prototype = {
  /**
   *
   * @param graphModel - {nodes:{}, edges:{}}
   * @param graphNodeAttributes - {1: {type:, reliability:, importance:, stickers:}, ...}
   * @param graphEdgeAttributes - {1: {type: }, ...}
   * @param scale
   * @param skin - {skinName, skin:{edge: , node: , nodeLabel: }}
   * @returns {scale: sc, {nodes: {id:{color:c, borderColor:b, opacity:o, size:s, stickers:stickers}, ...}, edges: {id: {color:c, borderColor:b, opacity:o, width:s}, ...}, nodeLabels: {id: {size: s}}}} - size and width is in (0, sc] interval
   */
  getDecoration: function(graphModel, graphNodeAttributes, graphEdgeAttributes, scale, skin){

    var i,
      type,
      reliability,
      importance,
      color,
      decoration = {scale: scale, nodes:{}, edges:{}, nodeLabels:{}},
      nodes = graphModel.nodes,
      edges = graphModel.edges,
      size = Math.min(scale/(GRASP.getObjectLength(nodes)), 5),//we do not want huge node size, set upper limit to 5 pixels
      labelSize = 3*size;

    for(i in nodes){
      type = graphNodeAttributes[nodes[i].nodeContentId].type;
      reliability = graphNodeAttributes[nodes[i].nodeContentId].reliability;
      importance = graphNodeAttributes[nodes[i].nodeContentId].importance;
      color = skin.node.attr.typeColors[type];
      var stickers = {};
      for(var stickername in skin.node.attr.stickers){
        if(
            typeof(graphNodeAttributes[nodes[i].nodeContentId].stickers) == 'undefined' ||
            graphNodeAttributes[nodes[i].nodeContentId].stickers == null ||
            graphNodeAttributes[nodes[i].nodeContentId].stickers.indexOf(stickername) == -1)
        {
          stickers[stickername] = null;
        } else {
          stickers[stickername] = skin.node.attr.stickers[stickername];
        }
      }
      decoration.nodes[i] = {color:color, borderColor:color, opacity:Math.max(0.1,reliability), size:Math.max(5, size*importance/20), stickers:stickers};
      if (skin.nodeLabel.attr.fixedSize) {
        decoration.nodeLabels[i] = {
          opacity: 1,
          size:skin.nodeLabel.attr.fixedSize
        };
      } else {
        decoration.nodeLabels[i] = {opacity: 1, size:Math.max(5, labelSize*importance/50)};
      }
    }
    for(i in edges){
      color = skin.edge.attr.typeColors[graphEdgeAttributes[edges[i].edgeContentId].type];
      decoration.edges[i] = {color:color, borderColor:color, opacity:1, width:size/20};
    }
    return decoration;
  }
};
