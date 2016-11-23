GRASP.GraphNodeLabelMappingRadial = function(){
  this._model_nodes = {};
  this._node_label_area_list = {};
};

GRASP.GraphNodeLabelMappingRadial.prototype = {
  getMapping: function(model, nodeMapping, nodeLabelAreaList, scale){
    this._model_nodes = model.getNodes();
    this._node_label_area_list = nodeLabelAreaList;

    var label_layout={}, i, label_angle, label_area, label_x, label_y, nodeMappingCoordinates = nodeMapping.mapping;

    for(i in this._model_nodes){
      var model_node = this._model_nodes[i];
      var layout_node = nodeMappingCoordinates[model_node.id];
       var node_angle = this._getNodeAngle(layout_node.x, layout_node.y);

      //do label layout
      if(node_angle >= Math.PI/2 || node_angle <= -Math.PI/2){
        label_angle = node_angle+Math.PI;
        label_area = this._node_label_area_list[model_node.id];

        label_x = layout_node.x - label_area.width*Math.cos(label_angle);
        label_y = layout_node.y - label_area.width*Math.sin(label_angle);

      }else{
        label_angle = node_angle;
        label_x = layout_node.x;
        label_y = layout_node.y;
      }
      label_layout[model_node.id] = {x:label_x, y:label_y, angle:label_angle, size:layout_node.size};
    }

    //create obj that implements iMapping
    var mapping = {
      area: nodeMapping.area,
      mapping: label_layout
    };
    return mapping;
  },

  _getNodeAngle: function(x, y){
    var r = Math.sqrt((x)*(x)+(y)*(y));
    var q = r>0 ? Math.acos((x)/r) : 0;
    return (y) > 0 ? q : -q;
  }
};