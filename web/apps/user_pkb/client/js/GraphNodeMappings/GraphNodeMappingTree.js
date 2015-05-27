/**
 * This module generate mapping of nodes that form a tree in a way that
 * each tree level is form circle. The greater the level the greater the radius of circle.
 * Each circle has the center in the center of the canvas ( = tree root node)
 * (It is visually similar to Reingold–Tilford “tidy” algorithm
 * https://github.com/mbostock/d3/wiki/Tree-Layout
 * http://emr.cs.iit.edu/~reingold/tidier-drawings.pdf)
 *
 * NB: the area of the mapping is always the {centerX: 0, centerY:0, width: this.SCALE_FACTOR, height: this.SCALE_FACTOR}
 */
YOVALUE.GraphNodeMappingTree = function(){
  this.SCALE_FACTOR = 400;
};

YOVALUE.GraphNodeMappingTree.prototype = {
  getMapping: function(model){
    if(!YOVALUE.implements(model, YOVALUE.iGraphNodeMappingTreeModel)){
      YOVALUE.errorHandler.throwError("Model do not implement iGraphNodeMappingTreeModel interface");
    }

    this._nodes = {};
    this._model = {};
    this._treeDepth = 0;

    this._model = model;
    this._rootNode = this._model.getRootNode();
    this._treeDepth = this._model.getGraphTreeDepth();
    this._minSectorTurn = 2*Math.PI/this._model.getPeripheryChildsCount(this._rootNode.id);
    this._updateNodeProperties(new YOVALUE.GraphNodeMappingTreeNode({'id':this._rootNode.id, 'x':0, 'y':0}));

    var _node_mapping = {};
    //we want to return only plain array of {id, x, y, size}
    var size = (1/(10*this._treeDepth));
    for(var i in this._nodes){
      _node_mapping[this._nodes[i].getId()] = {id:this._nodes[i].getId(), x:Math.round(this._nodes[i].getX()*this.SCALE_FACTOR), y:Math.round(this._nodes[i].getY()*this.SCALE_FACTOR), size:Math.round(size*this.SCALE_FACTOR)};
    }

    //create obj that implements iMapping
    var that = this;
    var mapping = {
      area: {centerX: 0, centerY:0, width: that.SCALE_FACTOR, height: that.SCALE_FACTOR},
      mapping:  _node_mapping
    };
    return mapping;
  },

  // -------- PRIVATE -------------
  _updateNodeProperties: function(node){
    this._nodes[node.getId()] = node;
    var childIds = this._model.getSkeletonChildIds(node.getId());

    for(var i = 0, l = childIds.length; i<l; i++){
      var child = new YOVALUE.GraphNodeMappingTreeNode({'id':childIds[i], 'x':0, 'y':0});
      this._nodes[child.getId()] = child;
      this._updateNodePosition(child, node, i == 0 ? null : this._nodes[childIds[i-1]]);
      this._updateNodeProperties(child);
    }
  },

  _updateNodePosition: function(node, parentNode, prevSiblingNode){
    var level = this._model.getLevel(node.getId());
    node.setR(level/(2*this._treeDepth));

    var peripheryChildsCount = this._model.getPeripheryChildsCount(node.getId());
    var childSectorTurn = peripheryChildsCount*this._minSectorTurn;
     if(childSectorTurn != 0){
      node.setSectorBeginAngle(prevSiblingNode != null ? (prevSiblingNode.getSectorBeginAngle() + prevSiblingNode.getSectorTurn()) : parentNode.getSectorBeginAngle());
      node.setSectorTurn(childSectorTurn);
    }else{
      node.setSectorBeginAngle(parentNode.getSectorBeginAngle());
      node.setSectorTurn(parentNode.getSectorTurn());
    }
  }
};



