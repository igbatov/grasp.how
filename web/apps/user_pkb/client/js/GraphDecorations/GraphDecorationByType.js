YOVALUE.GraphDecorationByType = function(){
  /*
  this._categoryColors = [
    ,
    ,
    ,
    ,
    ,
    ,
    "#FFFFE0",
    "#FFFF00",
    "#FFA500",
  ];
*/
};


YOVALUE.GraphDecorationByType.prototype = {
  /**
   *
   * @param graphModel - {getNodeTypes: function(){}, getEdgeTypes: function(){}, getNodes: function(){}, getEdges: function(){}}
   * @param graphNodeAttributes - {1: {type:, reliability:, importance:}, ...}
   * @param graphEdgeAttributes - {1: {type: }, ...}
   * @param scale
   * @param skin {skinName, skin:{edge: , node: , nodeLabel: }}
   * @returns {scale: sc, {nodes: {id:{color:c, borderColor:b, opacity:o, size:s}, ...}, edges: {id: {color:c, borderColor:b, opacity:o, width:s}, ...}, nodeLabels: {id: {size: s}}}} - size and width is in (0, sc] interval
   */
  getDecoration: function(graphModel, graphNodeAttributes, graphEdgeAttributes, scale, skin){

    var i,
      type,
      reliability,
      importance,
      color,
      decoration = {scale: scale, nodes:{}, edges:{}, nodeLabels:{}},
      nodes = graphModel.getNodes(),
      edges = graphModel.getEdges(),
      size = Math.min(scale/(2*YOVALUE.getObjectLength(nodes)), 5),//we do not want huge node size, set upper limit to 5 pixels
      labelSize = 1.8*size,
      skin = skin;

    for(i in nodes){
      type = graphNodeAttributes[nodes[i].nodeContentId].type;
      reliability = graphNodeAttributes[nodes[i].nodeContentId].reliability;
      importance = graphNodeAttributes[nodes[i].nodeContentId].importance;
      color = skin.node.attr.typeColors[type];
      if(reliability == 0) reliability = 99;
      if(importance == 0) importance = 99;

      decoration.nodes[i] = {color:color, borderColor:color, opacity:reliability/99, size:Math.max(1, size*importance/50)};
      decoration.nodeLabels[i] = {opacity: 1, size:Math.max(1, labelSize*importance/50)};
    }
    for(i in edges){
      color = skin.edge.attr.typeColors[graphEdgeAttributes[edges[i].edgeContentId].type];
      decoration.edges[i] = {color:color, borderColor:color, opacity:1, width:size/20};
    }
    return decoration;
  }
};
