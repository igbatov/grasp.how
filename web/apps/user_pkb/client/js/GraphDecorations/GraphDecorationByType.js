YOVALUE.GraphDecorationByType = function(){
  this._categoryColors = [
    "#00BFFF",
    "#87CEFA",
    "#3CB371",
    "#8FBC8F",
    "#FF69B4",
    "#FF0000",
    "#FFFFE0",
    "#FFFF00",
    "#FFA500",
  ];

};


YOVALUE.GraphDecorationByType.prototype = {
  /**
   *
   * @param graphModel - {getNodeTypes: function(){}, getEdgeTypes: function(){}, getNodes: function(){}, getEdges: function(){}}
   * @returns {scale: sc, {nodes: {id:{color:c, borderColor:b, opacity:o, size:s}, ...}, edges: {id: {color:c, borderColor:b, opacity:o, width:s}, ...}, nodeLabels: {id: {size: s}}}} - size and width is in (0, sc] interval
   */
  getDecoration: function(graphModel, graphNodeAttributes, graphEdgeAttributes, scale){

    var i,
      type,
      reliability,
      importance,
      typeIndex,
      decoration = {scale: scale, nodes:{}, edges:{}, nodeLabels:{}},
      nodeTypes = graphModel.getNodeTypes(),
      edgeTypes = graphModel.getEdgeTypes(),
      nodes = graphModel.getNodes(),
      edges = graphModel.getEdges(),
      size = Math.min(scale/(2*YOVALUE.getObjectLength(nodes)), 5),//we do not want huge node size, set upper limit to 5 pixels
      labelSize = 1.8*size;

    for(i in nodes){
      type = graphNodeAttributes[nodes[i].nodeContentId].type;
      reliability = graphNodeAttributes[nodes[i].nodeContentId].reliability;
      importance = graphNodeAttributes[nodes[i].nodeContentId].importance;
      if(reliability == 0) reliability = 99;
      if(importance == 0) importance = 99;
      typeIndex = nodeTypes.indexOf(graphNodeAttributes[nodes[i].nodeContentId].type);

      decoration.nodes[i] = {color:this._categoryColors[typeIndex], borderColor:this._categoryColors[typeIndex], opacity:reliability/99, size:Math.max(1, size*importance/50)};
      decoration.nodeLabels[i] = {opacity: 1, size:Math.max(1, labelSize*importance/50)};
    }

    for(i in edges){
      typeIndex = edgeTypes.indexOf(graphEdgeAttributes[edges[i].edgeContentId].type);
      decoration.edges[i] = {color:this._categoryColors[typeIndex], borderColor:this._categoryColors[typeIndex], opacity:1, width:size/20};
    }

    return decoration;
  }
};
