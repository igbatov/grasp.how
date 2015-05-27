YOVALUE.GraphReMappingTree = function(tree_model, node_clones, canvasWidth, center_x, center_y){
  this._tree_model = tree_model;
  this._canvasWidth = canvasWidth;
  this._center = {'x':center_x, 'y':center_y};

  this._node_clones = {};
  this._starting_node_clones = {};
  for(var i in node_clones){
    //save initial layout as we want always morph from this starting layout, not the last one
    this._starting_node_clones[node_clones[i].getId()] = node_clones[i].clone();
    this._node_clones[node_clones[i].getId()] = node_clones[i];
  }
};

YOVALUE.GraphReMappingTree.prototype = {
  morphLayout: function(center_node_id){
    //induce initial layout
    for(var i in this._starting_node_clones){
      var id = this._starting_node_clones[i].getId();
      this._node_clones[id].setX(this._starting_node_clones[i].getX());
      this._node_clones[id].setY(this._starting_node_clones[i].getY());
      this._node_clones[id].setLevel(this._starting_node_clones[i].getLevel());
    }

    //set nodes center to (0, 0) as all tnode calculations done under this assumption
    for(var i in this._node_clones){
      this._node_clones[i].setX(this._node_clones[i].getX() - this._center.x);
      this._node_clones[i].setY(this._node_clones[i].getY() - this._center.y);
    }

    var hypertree_depth = this._tree_model.getTreeDepth();

    //recursively set level, distance from center of each node starting from new root - center_node_id
    var traversed_nodes = [];
    var count = 0;

    var self = this;
    function setLevel(nodes){

      var next_neib_circle = [];

      for(var i in nodes){
        var is_node_traversed = false;
        for(var j in traversed_nodes) {
          if(traversed_nodes[j].getId() == nodes[i].getId()){
            var is_node_traversed = true;
            break;
          }
        }

        if(is_node_traversed) continue;

        nodes[i].setLevel(count);
        nodes[i].setR(nodes[i].getLevel()*self._canvasWidth/(2*hypertree_depth));

        traversed_nodes[nodes[i].getId()] = nodes[i];

        var neib_ids = self._tree_model.getNeighbourIds([nodes[i].getId()]);
        var node_neibs = [];
        for(var j in neib_ids){
          node_neibs.push(self._node_clones[neib_ids[j]]);
        }
        next_neib_circle = next_neib_circle.concat(node_neibs);
      }
      count++;

      if(next_neib_circle.length) setLevel(next_neib_circle);
    }

    setLevel([this._node_clones[center_node_id]]);

    //return original nodes center
    for(var i in this._node_clones){
      this._node_clones[i].setX(this._node_clones[i].getX() + this._center.x);
      this._node_clones[i].setY(this._node_clones[i].getY() + this._center.y);
    }
    return this._node_clones;
  }
};
