/**
 * GraphModelTree - adds to GraphModel some specific methods are helpful when dealing with tree structure
 */
YOVALUE.GraphModelTree = function (graphModel) {
  this.graphModel = graphModel;
  this.levels = {};
  this.rootNode = null;
  YOVALUE.mixin(graphModel, this);
  this.MAX_GRAPH_TREE_LEVEL = 1000;
};

YOVALUE.GraphModelTree.prototype = {
  /**
   * @param name {string}
   * @param nodeTypes {Array.<string>}
   * @param edgeTypes {Array.<string>}
   * @param nodeDefaultType {string}
   * @param edgeDefaultType {string}
   * @param isEditable {boolean}
   * @param isInTrash {boolean}
   */
  init: function(name, nodeTypes, edgeTypes, nodeDefaultType, edgeDefaultType, isEditable, attributes){
    //do all the ordinary graph model stuff
    this.graphModel.init(name, nodeTypes, edgeTypes, nodeDefaultType, edgeDefaultType, isEditable, attributes);
    return true;
  },

  /**
   *
   * @param elements is {nodes:{id:iGraphModelTreeNode, ...}, edges: {id:iGraphModelTreeEdge, ...}}
   * @returns {boolean}
   */
  setGraphElements: function(elements){
    this.checkElementsInterface(elements['nodes'], elements['edges']);
    this.graphModel.setGraphElements(elements);
    this.rootNode = this._findRootNode();

    //make sure that nodes and skeleton edges form a tree
    this._throwIfNotATree();
    this._computeLevels();
    return true;
  },

  checkElementsInterface: function(nodes, edges){
    var i;
    for(i in nodes){
      if(!YOVALUE.implements(nodes[i], YOVALUE.iGraphModelTreeNode)){
        console.log(nodes[i]);
        console.log(YOVALUE.iGraphModelTreeNode);
        YOVALUE.errorHandler.throwError('YOVALUE.GraphModelTree.init: node does not implement iGraphModelTreeNode interface');
      }
    }
    for(i in edges){
      if(!YOVALUE.implements(edges[i], YOVALUE.iGraphModelTreeEdge)){
        YOVALUE.errorHandler.throwError('YOVALUE.GraphModelTree.init: edge does not implement iGraphModelTreeEdge interface');
      }
    }
  },

  /*
   * Discard inherited by mixin addNode, addEdge, removeNode, removeEdge, updateNode, updateEdge methods of GraphModel
   * In GraphModelTree we use only applyChanges as a method of graph modification
   */
  addNode: function(v){
    YOVALUE.errorHandler.throwError('use applyChanges method instead!');
  },
  addEdge: function(v){
    YOVALUE.errorHandler.throwError('use applyChanges method instead!');
  },
  removeNode: function(v){
    YOVALUE.errorHandler.throwError('use applyChanges method instead!');
  },
  removeEdge: function(v){
    YOVALUE.errorHandler.throwError('use applyChanges method instead!');
  },
  updateNode: function(v){
    YOVALUE.errorHandler.throwError('use applyChanges method instead!');
  },
  updateEdge: function(v){
    YOVALUE.errorHandler.throwError('use applyChanges method instead!');
  },

  /**
   * Try to apply changes in one transaction.
   * It rolls back if the result graph of skeleton edges do not form a tree
   * Examples of changes:
   * - add new node:
   * c = {
      nodes : { add : { new_node_1: {id:'new_node_1'} }, remove : [], update : {} },
      edges : { add : { new_edge_1: {id:'new_edge_1', source:1, target:'new_node_1'} }, remove : [], update : {} }
    }
   * - remove node:
   * c = {
      nodes : { add : { }, remove : [ 4 ], update : {} },
      edges : { add : { }, remove : [], update : {} }
    }
   * @param c {YOVALUE.iGraphModelChanges}
   * @return {changes:{YOVALUE.iGraphModelChanges}, rollback:{YOVALUE.iGraphModelChanges}}
   */
  applyChanges: function(c){
    if(!YOVALUE.implements(c, YOVALUE.iGraphModelChanges)) YOVALUE.errorHandler.throwError('');
    var i, e, ch,
      changes = YOVALUE.clone(YOVALUE.iGraphModelChanges),
      rollback = {
        name: this.graphModel.getName(),
        nodes: YOVALUE.clone(this.graphModel.getNodes()),
        edges: YOVALUE.clone(this.graphModel.getEdges()),
        nodeTypes: YOVALUE.clone(this.graphModel.getNodeTypes()),
        edgeTypes: YOVALUE.clone(this.graphModel.getEdgeTypes()),
        nodeDefaultType: this.graphModel.getNodeDefaultType(),
        edgeDefaultType: this.graphModel.getEdgeDefaultType(),
        isEditable: this.graphModel.getIsEditable()
      },
    // Every new node or edge do not have real id yet.
    // Nevertheless instructions in nodes.update, edges.add, edges.update can have reference
    // to this not-yet-created nodes by means of "virtual ids" or "temporary ids"
    // i.e. ids that exists only in instructions "c".
    // When new nodes and edges from "c" added to graph its "virtual ids" are substituted by "real ids"
      virtualNodeIds = {}, //correspondence between virtual ids of nodes and real one
      virtualEdgeIds = {}; //correspondence between virtual ids of edges and real one

    //create nodes
    for(i in c.nodes.add){
      e = c.nodes.add[i];
      //check that virtual id do not exist in real node id pool
      if(this.graphModel._isNodeIdExists(i)) YOVALUE.errorHandler.throwError('Virtual node id is already exists in real node id pool. To prevent virtual id overlapping with real id try to specify it in none-number form. For example - "new_ID". It will be changed to number after creation.');
      ch = this._addNode(e);
      if(ch){
        virtualNodeIds[i] = +YOVALUE.getObjectKeys(ch.nodes.add)[0];
        changes = YOVALUE.deepmerge(ch, changes);
      }
    }
    //create edges
    for(i in c.edges.add){
      e = c.edges.add[i];
      //check that virtual id do not exist in real edge id pool
      if(this.graphModel._isEdgeIdExists(i)) YOVALUE.errorHandler.throwError('Virtual edge id is already exists in real edge id pool. To prevent virtual id overlapping with real id try to specify it in none-number form. For example - "new_ID". It will be changed to number after creation.');
      //if edge has virtual source and target - change it to real one
      if(typeof(virtualNodeIds[e.target]) != 'undefined') e.target = +virtualNodeIds[e.target];
      if(typeof(virtualNodeIds[e.source]) != 'undefined') e.source = +virtualNodeIds[e.source];
      ch = this._addEdge(e);
      if(ch){
        virtualEdgeIds[i] = YOVALUE.getObjectKeys(ch.edges.add)[0];
        changes = YOVALUE.deepmerge(ch, changes);
      }
    }

    //update nodes
    for(i in c.nodes.update){
      var id;
      e = c.nodes.update[i];
      //consider that we may want to update node that was just added
      id = typeof(virtualNodeIds[i]) != 'undefined' ? +virtualNodeIds[i] : +i;
      ch = this._updateNode(id, e);
      if(ch) changes = YOVALUE.deepmerge(ch, changes);
    }
    //update edges
    for(i in c.edges.update){
      e = c.edges.update[i];
      //consider that we may want to update edge that was just added
      id = typeof(virtualEdgeIds[i]) != 'undefined' ? +virtualEdgeIds[i] : +i;
      //and source or target can be virtual too
      if(typeof(e.target) !== 'undefined' && typeof(virtualNodeIds[e.target]) != 'undefined') e.target = virtualNodeIds[e.target];
      if(typeof(e.source) !== 'undefined' && typeof(virtualNodeIds[e.source]) != 'undefined') e.source = virtualNodeIds[e.source];

      ch = this._updateEdge(id, e);
      if(ch) changes = YOVALUE.deepmerge(ch, changes);
    }


    //remove nodes
    for(i in c.nodes.remove){
      id = c.nodes.remove[i];
      //consider that we may want to remove node that was just added
      id = typeof(virtualNodeIds[id]) != 'undefined' ? +virtualNodeIds[id] : +id;
      ch = this._removeNode(id);
      if(ch) changes = YOVALUE.deepmerge(ch, changes);
    }
    //remove edges
    for(i in c.edges.remove){
      id = c.edges.remove[i];
      //consider that we may want to remove edge that was just added
      id = typeof(virtualEdgeIds[id]) != 'undefined' ? +virtualEdgeIds[id] : +id;
      ch = this._removeEdge(id);
      if(ch) changes = YOVALUE.deepmerge(ch, changes);
    }

    if(!this._checkGraphIsATree()){
      this.graphModel.init(rollback.name, rollback.nodeTypes, rollback.edgeTypes, rollback.nodeDefaultType, rollback.edgeDefaultType, rollback.isEditable);
      this.setGraphElements({nodes: rollback.nodes, edges: rollback.edges});
      YOVALUE.errorHandler.notifyError('Changes are not valid');
      YOVALUE.errorHandler.notifyError(c);
      return YOVALUE.clone(YOVALUE.iGraphModelChanges);
    }
    this._computeLevels();

    return changes;
  },



  _addNode: function(node){
    var newNode = YOVALUE.clone(YOVALUE.iGraphModelTreeNode);

    // copy known attributes of new node
    for(var i in node){
      newNode[i] = node[i]
    }

    //init default values
    newNode.isRoot = false;
    return this.graphModel.addNode(newNode);
  },

  _addEdge: function(edge){
    //refuse to add edge from node to itself
    if(edge.source == edge.target) return false;

    //refuse to add duplicate edge
    if(this.getEdgeIdBySrcDst(edge.source, edge.target) !== null) return false;

    //refuse to add duplicate edge even if it is reversed
    if(this.getEdgeIdBySrcDst(edge.target, edge.source) !== null) return false;

    var newEdge = YOVALUE.clone(YOVALUE.iGraphModelTreeEdge);

    // init default values
    newEdge.isSkeleton = false;

    // copy or add attributes of new edge
    for(var i in edge){
      newEdge[i] = edge[i]
    }

    // if there is no other skeleton edges from source to target, mark edge as skeleton
    var skeletonParentExists = false;
    var parentEdges = this.graphModel.getEdges(this.graphModel.getEdgesFromParentIds(newEdge.target));
    for(var i in parentEdges){
      if(parentEdges[i].isSkeleton === true){
        skeletonParentExists = true;
        break;
      }
    }
    if(!skeletonParentExists) newEdge.isSkeleton = true;

    return this.graphModel.addEdge(newEdge);
  },

  /**
   * Remove node in such a way that tree structure is preserved
   * @param nodeId
   * @return {YOVALUE.iGraphModelChanges}
   */
  _removeNode: function(nodeId){
    var c1 = YOVALUE.clone(YOVALUE.iGraphModelChanges), changes;

    //rewire all outbound skeleton edges of node to its parent
    var edgesIds = this.getEdgesToChildIds(nodeId, true), edge, parentNodeId = this.getParentNodeId(nodeId), edgeFromParent;

    for(var i in edgesIds){
      edge = this.getEdge(edgesIds[i]);
      //if edge from nodeId parent to nodeId child already exists, make it skeleton
      edgeFromParent = this.getEdge(this.getEdgeIdBySrcDst(parentNodeId, edge.target));
      if(edgeFromParent !== null){
        changes = this._updateEdge(edgeFromParent.id, {isSkeleton: true});
      }else{
        //remove edge from nodeId child to nodeId parent if any
        c1 = this._removeEdge(this.getEdgeIdBySrcDst(edge.target, parentNodeId));
        changes = this._updateEdge(edgesIds[i], {source:parentNodeId});
      }
      c1 = YOVALUE.deepmerge(c1, changes);
    }

    var c2 = this.graphModel.removeNode(nodeId);

    return YOVALUE.deepmerge(c1, c2);
  },

  /**
   * Remove edge in such a way that tree structure is preserved
   * @param edgeId
   * @return {YOVALUE.iGraphModelChanges}
   */
  _removeEdge: function(edgeId){
    var c = YOVALUE.clone(YOVALUE.iGraphModelChanges), e = this.getEdge(edgeId);
    if(!e || e.isSkeleton) return c;
    c = this.graphModel.removeEdge(edgeId);
    return c;
  },

  /**
   *
   * @param nodeId
   * @param nodeAttributes - i.e. {label:'newLabel', type:'newType'}
   * @return {YOVALUE.iGraphModelChanges}
   */
  _updateNode: function(nodeId, nodeAttributes){
    var c = YOVALUE.clone(YOVALUE.iGraphModelChanges);
    for(var i in nodeAttributes){
      //refuse to modify id attribute or add new unknown attribute
      if(i == 'id' || typeof(YOVALUE.iGraphModelTreeNode[i]) == 'undefined') continue;
      c = YOVALUE.deepmerge(c, this.graphModel.updateNode(nodeId, nodeAttributes));
    }
    return c;
  },

  /**
   *
   * @param edgeId
   * @param edgeAttributes
   * @return {YOVALUE.iGraphModelChanges}
   */
  _updateEdge: function(edgeId, edgeAttributes){
    var c = YOVALUE.clone(YOVALUE.iGraphModelChanges);
    for(var i in edgeAttributes){
      // refuse to modify id or add new unknown attribute
      if(i == 'id' || typeof(YOVALUE.iGraphModelTreeEdge[i]) == 'undefined') continue;
      c = YOVALUE.deepmerge(c, this.graphModel.updateEdge(edgeId, edgeAttributes));

    }
    return c;
  },

  getEdgesFromParentIds: function(nodeId, opt_isSkeleton){
    if(typeof(opt_isSkeleton) == 'undefined') return this.graphModel.getEdgesFromParentIds(nodeId);
    var edges = this.getEdges(this.graphModel.getEdgesFromParentIds(nodeId)),
      edgeIds = [],
      i;

    for(i in edges){
      if(edges[i].isSkeleton === opt_isSkeleton) edgeIds.push(edges[i].id);
    }
    return edgeIds;
  },

  getEdgesToChildIds: function(nodeId, opt_isSkeleton){
    if(typeof(opt_isSkeleton) == 'undefined') return this.graphModel.getEdgesToChildIds(nodeId);
    var edges = this.getEdges(this.graphModel.getEdgesToChildIds(nodeId)),
      edgeIds = [],
      i;
    for(i in edges){
      if(edges[i].isSkeleton == opt_isSkeleton) edgeIds.push(edges[i].id);
    }
    return edgeIds;
  },

  getRootNode: function(){
    return this.rootNode;
  },

  getLevel: function(node_id){
    for(var i in this.levels){
      if(this.levels[i].indexOf(node_id) != -1) return parseInt(i);
    }
  },

  getGraphTreeDepth: function(){
    return YOVALUE.getObjectLength(this.levels);
  },

  /**
   * Get skeleton parent node id
   * @param nodeId
   */
  getParentNodeId: function(nodeId){
    var parentEdgeIds = this.getEdgesFromParentIds(nodeId), i, e;
    for(i in parentEdgeIds){
      e = this.getEdge(parentEdgeIds[i]);
      if(e.isSkeleton) return e.source;
    }
  },

  getPeripheryChildsCount: function(nodeId){
    var node = this.getNode(nodeId);
    var peripheryChildsCount = 0,
      childIds = this.getSkeletonChildIds(node.id),
      l = childIds.length;

    if(l == 0) return 1;
    for(var i = 0; i<l; i++){
      peripheryChildsCount += this.getPeripheryChildsCount(childIds[i]);
    }

    return peripheryChildsCount;
  },

  /**
   *
   * @param nodeId - id of node
   * @param opt_callCount - used internally to make recursive calls without risk of stack overflow
   * @return {*}
   */
  getAllTreeChildIds: function(nodeId, opt_callCount){
    //track opt_callCount to stop infinite recursive call stack overflow
    if(typeof(opt_callCount) == 'undefined') opt_callCount = 1;
    else opt_callCount++;
    if(opt_callCount > this.MAX_GRAPH_TREE_LEVEL) YOVALUE.errorHandler.throwError('More that '+this.MAX_GRAPH_TREE_LEVEL+' recursive calls - graph is too deep or has cycles');

    var childIds = this.getSkeletonChildIds(nodeId);
    var allChildIds = childIds;

    for(var i = 0; i<childIds.length; i++){
      allChildIds = allChildIds.concat(this.getAllTreeChildIds(childIds[i], opt_callCount));
    }

    return allChildIds;
  },

  /**
   *
   * @param nodeId
   * @return {Array}
   */
  getSkeletonChildIds: function(nodeId){
    var neighbours = [], node;
    var childEdgeIds = this.getEdgesToChildIds(nodeId);

    for(var j=0; j<childEdgeIds.length; j++){
      node = this.getNode(this.getEdge(childEdgeIds[j]).target);
      if(this.getEdge(childEdgeIds[j]).isSkeleton == true){
        neighbours.push(node.id);
      }
    }

    return neighbours;
  },

  _throwIfNotATree: function(){
    if(!this._checkGraphIsATree()) YOVALUE.errorHandler.throwError('YOVALUE.GraphModelTree.init: nodes and edges do not form a tree!');
  },

  /**
   * Check if graph started from root node and traversed by only skeleton edges forms a tree
   * @private
   */
  _checkGraphIsATree: function(){
    var rootChilds = this.getAllTreeChildIds(this.getRootNode().id),
        treeNodes = rootChilds.concat(this.getRootNode().id),
        i;

    //if every node exists in treeNodes once and only once it is a tree
    if(YOVALUE.getObjectLength(this.getNodes()) != treeNodes.length) return false;

    for(i in this.getNodes()){
      if(treeNodes.indexOf(Number(i)) == -1) return false;
    }
    return true;
  },

  /**
   * Fill in structure this.levels = {
   *   0: [rootNodeId],
   *   1: [1stRootChildNode, 2ndRootChildNode, ...],
   *   2: [all childs of all nodes in this.levels[1] nodes],
   *   ...
   * }
   * @private
   */
  _computeLevels: function(){
    this.levels = {};
    var level = 0;
    this.levels[level] = [this.getRootNode().id];
    var traversedNodesCount = 1;
    while(traversedNodesCount < YOVALUE.getObjectLength(this.getNodes())){
      level++;
      this.levels[level] = [];
      for(var i in this.levels[level-1]){
        var childIds = this.getSkeletonChildIds(this.levels[level-1][i]);
        this.levels[level] = this.levels[level].concat(childIds);
      }
      traversedNodesCount += this.levels[level].length;
    }
  },

  _findRootNode: function(){
    var i, nodes = this.getNodes();

    for(i in nodes){
      if(nodes[i].isRoot == true) return nodes[i];
    }
    //No root node found
    YOVALUE.errorHandler.throwError('GraphModelTree cannot find root node');
  }
};
