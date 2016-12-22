/**
 * Base graph model  - implement base create, update, delete methods to work with graph
 * @implements {GRASP.iGraphModel}
 */
GRASP.GraphModel = function (graphId) {
  this.nodes = {};
  this.edges = {};
  this.nodeTypes = {};
  this.edgeTypes = {};
  this.nodeDefaultType = {};
  this.edgeDefaultType = {};

  this.graphId = graphId;
  this.graphName = "";
  this.isEditable = false;
  this.attributes = false;  // just a storage of key:value that is useful for some other modules but has no direct relation to graph model (i.e. isInTrash, isDifferenceGraph)
  this.timestamp = null;

  //this read-only version will be exposed in getNodes(), getEdges() methods
  this.readOnlyNodes = {};
  this.readOnlyEdges = {};
};

GRASP.GraphModel.prototype = {
  /**
   *
   * @param name
   * @param nodeTypes {Array.<string>}
   * @param edgeTypes {Array.<string>}
   * @param nodeDefaultType {string}
   * @param edgeDefaultType {string}
   * @param isEditable {boolean} - can this model be changed?
   * @param attributes {Array.<string>}
   */
  init: function(name, nodeTypes, edgeTypes, nodeDefaultType, edgeDefaultType, isEditable, attributes){
    //sanity check - nodes and edges should implement at minimum iGraphModelNode structure
    var i;

    //sanity check - nodeTypes and edgeTypes must be of type {Array.<string>}
    if(GRASP.typeof(nodeTypes) !== 'array'){
      GRASP.errorHandler.throwError('nodeTypes must be of type {Array.<string>}');
    }
    for(i in nodeTypes){
      if(GRASP.typeof(nodeTypes[i]) !== 'string'){
        GRASP.errorHandler.throwError('nodeTypes must be of type {Array.<string>}');
      }
    }
    if(GRASP.typeof(edgeTypes) !== 'array'){
      GRASP.errorHandler.throwError('edgeTypes must be of type {Array.<string>}');
    }
    for(i in edgeTypes){
      if(GRASP.typeof(edgeTypes[i]) !== 'string'){
        GRASP.errorHandler.throwError('edgeTypes must be of type {Array.<string>}');
      }
    }

    //sanity check - nodeDefaultType and edgeDefaultType must be of type String
    if(GRASP.typeof(nodeDefaultType) !== 'string'){
      GRASP.errorHandler.throwError('nodeDefaultType must be of type string, for now it is '+GRASP.typeof(nodeDefaultType));
    }
    if(GRASP.typeof(edgeDefaultType) !== 'string'){
      GRASP.errorHandler.throwError('edgeDefaultType must be of type string, for now it is '+GRASP.typeof(edgeDefaultType));
    }

    // clone to inner model
    this.graphName = name;
    this.nodeTypes = GRASP.clone(nodeTypes, {configurable: true, enumerable: true, writable: true});
    this.edgeTypes = GRASP.clone(edgeTypes, {configurable: true, enumerable: true, writable: true});
    this.nodeDefaultType = nodeDefaultType;
    this.edgeDefaultType = edgeDefaultType;
    this.isEditable = isEditable;
    this.attributes = attributes;

    // update read-only version of nodes and edges that will be exposed to external world
    // (all graph modifications should be done via update, add, remove methods defined below)
    this._updateReadOnlyModel();

    //fix time of model change
    this._updateTimestamp();
    return true;
  },

  /**
   *
   * @param elements is {nodes:{id:iGraphModelNode, ...}, edges: {id:iGraphModelEdge, ...}}
   * @returns {boolean}
   */
  setGraphElements: function(elements){
    var i, nodes = elements['nodes'], edges = elements['edges'];

    for(i in nodes){
      if(GRASP.implements(nodes[i], GRASP.iGraphModelNode) !== true){
        GRASP.errorHandler.throwError('node does not implement iGraphModelNode interface');
      }
      if(i != nodes[i].id){
        GRASP.errorHandler.throwError('nodes key != node.id ('+i+' != '+nodes[i].id+')');
      }
    }
    for(i in edges){
      if(GRASP.implements(edges[i], GRASP.iGraphModelEdge) !== true){
        GRASP.errorHandler.throwError('edge does not implement iGraphModelEdge interface');
      }
      if(i != edges[i].id){
        GRASP.errorHandler.throwError('edges key != edge.id ('+i+' != '+edges[i].id+')');
      }
    }

    this.nodes = GRASP.clone(nodes, {configurable: true, enumerable: true, writable: true});
    this.edges = GRASP.clone(edges, {configurable: true, enumerable: true, writable: true});

    this._updateReadOnlyModel();
    this._updateTimestamp();
    return true;
  },

  /**
   * Set if this model can be modified
   * @param v - boolean
   */
  setIsEditable: function(v){
    this.isEditable = v;
  },

  getIsEditable: function(){
    return this.isEditable === true;
  },

  getAttributes: function(){
    return this.attributes;
  },

  setAttribute: function(name, v){
    this.attributes[name] = v;
  },

  getAttribute: function(name){
    return this.attributes[name];
  },

  /**
   * @return {*} time in milliseconds of last modification
   */
  getTimestamp: function(){
    return this.timestamp;
  },

  getName: function(){
    return this.graphName;
  },
  setName: function(name){
    this.graphName = name;
  },

  /**
   *
   * @param node - implementation of iGraphModelNode
   * @return {GRASP.iGraphModelChanges}
   */
  addNode: function(node){
    // create GRASP.iGraphModelChanges implementation
    var c = GRASP.clone(GRASP.iGraphModelChanges);
    if(!this.isEditable) return c;

    var nodeId = this._getFreeId('nodes');
    var newNode = GRASP.clone(GRASP.iGraphModelNode);
    // copy known attributes of new node
    for(var i in node){
      newNode[i] = node[i]
    }

    newNode.id = nodeId;

    // sanity check
    if(GRASP.implements(newNode, GRASP.iGraphModelNode) !== true){
      console.log(newNode);
      console.log(GRASP.iGraphModelNode);
      GRASP.errorHandler.throwError('GRASP.GraphModel.addNode: node does not implement iGraphModelNode interface');
    }

    this.nodes[nodeId] = newNode;

    this._updateTimestamp();
    this._updateReadOnlyModel();

    c.nodes.add[nodeId] = this.getNode(nodeId);
    return c;
  },

  /**
   *
   * @param edge {GRASP.iGraphModelEdge}
   * @return {GRASP.iGraphModelChanges}
   */
  addEdge: function(edge){
    // create GRASP.iGraphModelChanges implementation
    var c = GRASP.clone(GRASP.iGraphModelChanges);
    if(!this.isEditable) return c;

    var edgeId = this._getFreeId('edges');
    var newEdge = GRASP.clone(GRASP.iGraphModelEdge);

    // copy or add attributes of new edge
    for(var i in edge){
      newEdge[i] = edge[i];
    }

    newEdge.id = edgeId;

    // sanity check
    if(GRASP.implements(newEdge, GRASP.iGraphModelEdge) !== true){
      console.log(newEdge);
      console.log(GRASP.iGraphModelEdge);
      GRASP.errorHandler.throwError('GRASP.GraphModel.addEdge: edge does not implement iGraphModelEdge interface');
    }

    this.edges[edgeId] = newEdge;

    this._updateTimestamp();
    this._updateReadOnlyModel();
    c.edges.add[edgeId] = this.getEdge(edgeId);
    return c;
  },

  /**
   * Remove node and all adjacent edges
   * @param id
   * @returns {GRASP.iGraphModelChanges|boolean}
   */
  removeNode: function(id){
    // create GRASP.iGraphModelChanges implementation
    var c = GRASP.clone(GRASP.iGraphModelChanges);
    if(!this.isEditable) return c;

    var i, edges,
      changes;

    // sanity check
    if(typeof(this.nodes[id]) === 'undefined'){
      return false;
    }

    // remove all adjacent edges
    edges = this.getEdgesToChildIds(id);
    for(i in edges) {
      changes = this.removeEdge(edges[i]);
      c = GRASP.deepmerge(c, changes);
    }

    edges = this.getEdgesFromParentIds(id);
    for(i in edges) {
      changes = this.removeEdge(edges[i]);
      c = GRASP.deepmerge(c, changes);
    }

    // remove node
    delete this.nodes[id];
    this._updateReadOnlyModel();

    c.nodes.remove = [id];
    return c;
  },

  /**
   *
   * @param edgeId
   * @returns {GRASP.iGraphModelChanges}
   */
  removeEdge: function(edgeId){
    // create GRASP.iGraphModelChanges implementation
    var c = GRASP.clone(GRASP.iGraphModelChanges);
    if(!this.isEditable) return c;

    delete this.edges[edgeId];
    this._updateReadOnlyModel();

    c.edges.remove = [edgeId];
    return c;
  },

  /**
   *
   * @param nodeId
   * @param nodeAttributes
   * @return {GRASP.iGraphModelChanges}
   */
  updateNode: function(nodeId, nodeAttributes){
    // create GRASP.iGraphModelChanges implementation
    var c = GRASP.clone(GRASP.iGraphModelChanges);
    if(!this.isEditable) return c;

    if(typeof(this.nodes[nodeId]) == 'undefined') return c;
    for(var i in nodeAttributes){
      if(i == 'id' && this.nodes[nodeId][i] !== nodeAttributes[i]) GRASP.errorHandler.throwError('Node ids cannot be updated '+this.nodes[nodeId][i]+' !== '+nodeAttributes[i]);
      this.nodes[nodeId][i] = nodeAttributes[i];
    }
    this._updateReadOnlyModel();

    c.nodes.update[nodeId] = nodeAttributes;
    return c;
  },

  /**
   *
   * @param edgeId
   * @param edgeAttributes
   * @return {GRASP.iGraphModelChanges}
   */
  updateEdge: function(edgeId, edgeAttributes){
    // create GRASP.iGraphModelChanges implementation
    var c = GRASP.clone(GRASP.iGraphModelChanges);
    if(!this.isEditable) return c;

    if(typeof(this.edges[edgeId]) == 'undefined') return c;
    for(var i in edgeAttributes){
      if(i == 'id' && this.edges[edgeId][i] !== edgeAttributes[i]) GRASP.errorHandler.throwError('Edge ids cannot be updated');
      this.edges[edgeId][i] = edgeAttributes[i];
    }
    this._updateReadOnlyModel();

    c.edges.update[edgeId] = edgeAttributes;
    return c;
  },

  getNode: function(id){
    return GRASP.compare(this.getNodes([id]), {}) ? null : this.getNodes([id])[id];
  },

  getEdge: function(id){
    return GRASP.compare(this.getEdges([id]), {}) ? null : this.getEdges([id])[id];
  },

  /**
   *
   * @param ids {Array.<number>} opt_argument
   * @returns {*}
   */
  getNodes: function(ids){
    var arr = {};

    if(!ids){
      return this.readOnlyNodes;
    }

    for(var i in ids){
      if(typeof(this.readOnlyNodes[ids[i]]) !== 'undefined') arr[ids[i]] = this.readOnlyNodes[ids[i]];
    }

    return  arr;
  },

  /**
   * Returns contentIds of nodeId parents
   * @param nodeId
   * @returns {Array}
   */
  getParentNodesContentIds: function(nodeId){
    var parentEdges = this.getEdges(this.getEdgesFromParentIds(nodeId));
    var parentNodeIds = [];
    for(var i in parentEdges) parentNodeIds.push(parentEdges[i].source);
    var parentNodes = this.getNodes(parentNodeIds);
    var parentNodeContentIds = [];
    for(i in parentNodes) parentNodeContentIds.push(parentNodes[i].nodeContentId);
    return parentNodeContentIds;
  },

  /**
   *
   * @param ids {Array.<number>} opt_argument
   * @returns {*}
   */
  getEdges: function(ids){
    var arr = {}, i;
    if(!ids){
      return this.readOnlyEdges;
    }

    for(i in ids){
      if(typeof(this.readOnlyEdges[ids[i]]) !== 'undefined') arr[ids[i]] = this.readOnlyEdges[ids[i]];
    }

    return arr;
  },

  getNodeTypes: function(){
    return this.nodeTypes;
  },

  getEdgeTypes: function(){
    return this.edgeTypes;
  },

  getGraphName: function(){
    return this.graphName;
  },

  getGraphId: function(){
    return this.graphId;
  },

  getNeighbourIds: function(nodeIds){
    var neighbourIds = [], nodeId, edgeIds, j;
    for(var i in nodeIds){
      nodeId = nodeIds[i];
      edgeIds = this.getEdgesFromParentIds(nodeId);
      for(j=0; j<edgeIds.length; j++){
        neighbourIds.push(this.edges[edgeIds[j]].source);
      }
      edgeIds = this.getEdgesToChildIds(nodeId);
      for(j=0; j<edgeIds.length; j++){
        neighbourIds.push(this.edges[edgeIds[j]].target);
      }
    }
    return neighbourIds;
  },

  /**
   * Get all edges for which nodeId is the source
   * @param nodeId - id of parent node
   * @return {Array}
   */
  getEdgesToChildIds: function (nodeId){
    var edgesToChildIds = [], i;
    for(i in this.edges){
      var e = this.edges[i];
      if(nodeId == e.source){
        edgesToChildIds.push(e.id);
      }
    }
    return edgesToChildIds;
  },

  /**
   * Get all edges for which nodeId is the target
   * @param nodeId
   * @return {Array}
   */
  getEdgesFromParentIds: function (nodeId){
    var edgesFromParentIds = [];
    for(var i in this.edges){
      var e = this.edges[i];
      if(nodeId == e.target){
        edgesFromParentIds.push(e.id);
      }
    }
    return edgesFromParentIds;
  },

  getNeighbourEdgeIds: function(nodeId){
    return this.getEdgesFromParentIds(nodeId).concat(this.getEdgesToChildIds(nodeId));
  },

  /**
   * Get edge id by its source node id and target node id
   * @param srcNodeId
   * @param dstNodeId
   * @returns {*}
   */
  getEdgeIdBySrcDst: function(srcNodeId, dstNodeId){
    var i;
    for(i in this.edges){
      var e = this.edges[i];
      if(srcNodeId == e.source && dstNodeId == e.target){
        return e.id;
      }
    }
    return null;
  },

  // Deikstra algorithm (we do not take in to account edge direction in this case - all node neighbours accessible from node)
  getShortestPaths: function(fromNodeId){
    var d = {}; //d[i] - length of the shortest path from node fromNodeId to node i
    var p = {}; //p[i] - shortest path (in form [fromNodeId, n1_id, n2_id, ...]) from node fromNodeId to node i
    var U = {}; //Set of nodes that is already passed

    d[fromNodeId] = 0;
    for(var i in this.nodes){
      U[this.nodes[i].id] = 0; //indicates that at start no node is in U
      p[this.nodes[i].id] = [];
      if(this.nodes[i].id != fromNodeId) d[this.nodes[i].id] = Infinity;
    }

    function getMinPathNodeNotInU(){
      var min_d = Infinity;
      var min_node_id;
      for(var i in U){
        if(U[i] == 0 && d[i] < min_d){
          min_d = d[i];
          min_node_id = i;
        }
      }
      return typeof(min_node_id) == 'undefined' ? false : min_node_id;
    }

    var v_id = getMinPathNodeNotInU();
    while(v_id != false){
      U[v_id] = 1;
      var neighbourIds = this.getNeighbourIds([v_id]);
      for(var j in neighbourIds){
        var u_id = neighbourIds[j];
        if(U[u_id] == 0 && d[u_id] > d[v_id] + 1){
          d[u_id] = d[v_id] + 1;
          p[u_id] = p[v_id].concat([u_id]);
        }
      }
      v_id = getMinPathNodeNotInU();
    }

    return {'paths':p, 'lengths':d}
  },

  getEdgeDefaultType: function(){
    return this.edgeDefaultType;
  },
  getNodeDefaultType: function(){
    return this.nodeDefaultType;
  },

  getNodeByNodeContentId: function(nodeContentId){
    for(var i in this.nodes){
      if(this.nodes[i].nodeContentId == nodeContentId) return this.getNode(this.nodes[i].id);
    }
  },

  getEdgeByEdgeContentId: function(edgeContentId){
    for(var i in this.edges){
      if(this.edges[i].edgeContentId == edgeContentId) return this.getEdge(this.edges[i].id);
    }
  },

  /**
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
   * @param c {GRASP.iGraphModelChanges}
   * @return {changes:{GRASP.iGraphModelChanges}, rollback:{GRASP.iGraphModelChanges}}
   */
  applyChanges: function(c){
    if(!GRASP.implements(c, GRASP.iGraphModelChanges)) GRASP.errorHandler.throwError('');
    var i, e, ch,
        changes = GRASP.clone(GRASP.iGraphModelChanges),
        rollback = {
          name: this.getName(),
          nodes: GRASP.clone(this.getNodes()),
          edges: GRASP.clone(this.getEdges()),
          nodeTypes: GRASP.clone(this.getNodeTypes()),
          edgeTypes: GRASP.clone(this.getEdgeTypes()),
          nodeDefaultType: this.getNodeDefaultType(),
          edgeDefaultType: this.getEdgeDefaultType(),
          isEditable: this.getIsEditable(),
          attributes: this.getAttributes()
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
      if(this._isNodeIdExists(i)) GRASP.errorHandler.throwError('Virtual node id is already exists in real node id pool. To prevent virtual id overlapping with real id try to specify it in none-number form. For example - "new_ID". It will be changed to number after creation.');
      ch = this.addNode(e);
      if(ch){
        virtualNodeIds[i] = +GRASP.getObjectKeys(ch.nodes.add)[0];
        changes = GRASP.deepmerge(ch, changes);
      }
    }
    //create edges
    for(i in c.edges.add){
      e = c.edges.add[i];
      //check that virtual id do not exist in real edge id pool
      if(this._isEdgeIdExists(i)) GRASP.errorHandler.throwError('Virtual edge id is already exists in real edge id pool. To prevent virtual id overlapping with real id try to specify it in none-number form. For example - "new_ID". It will be changed to number after creation.');
      //if edge has virtual source and target - change it to real one
      if(typeof(virtualNodeIds[e.target]) != 'undefined') e.target = +virtualNodeIds[e.target];
      if(typeof(virtualNodeIds[e.source]) != 'undefined') e.source = +virtualNodeIds[e.source];
      ch = this.addEdge(e);
      if(ch){
        virtualEdgeIds[i] = GRASP.getObjectKeys(ch.edges.add)[0];
        changes = GRASP.deepmerge(ch, changes);
      }
    }

    //update nodes
    for(i in c.nodes.update){
      var id;
      e = c.nodes.update[i];
      //consider that we may want to update node that was just added
      id = typeof(virtualNodeIds[i]) != 'undefined' ? +virtualNodeIds[i] : +i;
      ch = this.updateNode(id, e);
      if(ch) changes = GRASP.deepmerge(ch, changes);
    }
    //update edges
    for(i in c.edges.update){
      e = c.edges.update[i];
      //consider that we may want to update edge that was just added
      id = typeof(virtualEdgeIds[i]) != 'undefined' ? +virtualEdgeIds[i] : +i;
      //and source or target can be virtual too
      if(typeof(e.target) !== 'undefined' && typeof(virtualNodeIds[e.target]) != 'undefined') e.target = virtualNodeIds[e.target];
      if(typeof(e.source) !== 'undefined' && typeof(virtualNodeIds[e.source]) != 'undefined') e.source = virtualNodeIds[e.source];

      ch = this.updateEdge(id, e);
      if(ch) changes = GRASP.deepmerge(ch, changes);
    }


    //remove nodes
    for(i in c.nodes.remove){
      id = c.nodes.remove[i];
      //consider that we may want to remove node that was just added
      id = typeof(virtualNodeIds[id]) != 'undefined' ? +virtualNodeIds[id] : +id;
      ch = this.removeNode(id);
      if(ch) changes = GRASP.deepmerge(ch, changes);
    }
    //remove edges
    for(i in c.edges.remove){
      id = c.edges.remove[i];
      //consider that we may want to remove edge that was just added
      id = typeof(virtualEdgeIds[id]) != 'undefined' ? +virtualEdgeIds[id] : +id;
      ch = this.removeEdge(id);
      if(ch) changes = GRASP.deepmerge(ch, changes);
    }

    // TODO: implement some reasonable check for new graph correctness here
    if(0){
      this.init(rollback.name, rollback.nodeTypes, rollback.edgeTypes, rollback.nodeDefaultType, rollback.edgeDefaultType, rollback.isEditable, rollback.attributes);
      this.setGraphElements({nodes: rollback.nodes, edges: rollback.edges});
      GRASP.errorHandler.notifyError('Changes are not valid');
      GRASP.errorHandler.notifyError(c);
      return GRASP.clone(GRASP.iGraphModelChanges);
    }

    return changes;
  },


  _getFreeId: function(type){
    var max_id = -1;
    var arr = type == 'nodes' ? this.nodes : this.edges;
    for(var i in arr){
       if(parseInt(i)>max_id) max_id = i;
    }
    ++max_id;
    return max_id;
  },

  _updateTimestamp: function(){
    this.timestamp = Date.now();
  },

  /**
   * Maintain read only clones of nodes and edges
   * These clones are exposed to external modules to exclude opportunity of indirect model modification
   * @private
   */
  _updateReadOnlyModel: function(){
    var i;
    this.readOnlyNodes = {};
    this.readOnlyEdges = {};
    for(i in this.nodes) this.readOnlyNodes[i] = Object.freeze(GRASP.clone(this.nodes[i]));
    for(i in this.edges) this.readOnlyEdges[i] = Object.freeze(GRASP.clone(this.edges[i]));
    Object.freeze(this.readOnlyNodes);
    Object.freeze(this.readOnlyEdges);
  },

  _isNodeIdExists: function(id){
    var i;
    for(i in this.nodes){
      if(this.nodes[i].id == id) return true;
    }
    return false;
  },

  _isEdgeIdExists: function(id){
    var i;
    for(i in this.edges){
      if(this.edges[i].id == id) return true;
    }
    return false;
  }
};
