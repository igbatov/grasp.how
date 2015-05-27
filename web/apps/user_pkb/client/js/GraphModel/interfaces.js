/**
 *
 * @typedef {{
 *  nodes: {
 *    add: Object.<number,YOVALUE.iGraphModelNode>,
 *    remove: Array.<number>,
 *  },
 *  edges: {
 *    add: Object.<number,YOVALUE.iGraphModelEdge>,
 *    remove: Array.<number>,
 *    update: Object.<number,Object.<string,string>>,
 *  }
 *    }}
 */
YOVALUE.iGraphModelChanges = {
  nodes:{
    add:{},
    remove:[]
  },
  edges:{
    add:{},
    remove:[],
    update:{}
  }
};

/**
 * GraphModel edge interface
 * @type {{id: number, source: number, target: number, edgeContentId: number}}
 */
YOVALUE.iGraphModelEdge = {
  id: Number(),
  source: Number(),
  target: Number(),
  edgeContentId: String()
};

/**
 * GraphModel node interface
 * @typedef {{id: number, nodeContentId: number}}
 */
YOVALUE.iGraphModelNode = {
  id: Number(),
  nodeContentId: String()
};

/**
 * GraphModelTree edge interface
 * @type {{id: number, source: number, target: number, isSkeleton:boolean, edgeContentId: number}}
 */
YOVALUE.iGraphModelTreeEdge = {
  id: Number(),
  source: Number(),
  target: Number(),
  isSkeleton: Boolean(),
  edgeContentId: String()
};

/**
 * GraphModelTree edge interface
 * @type {{id: number, isRoot:boolean, nodeContentId: number}}
 */
YOVALUE.iGraphModelTreeNode = {
  id: Number(),
  isRoot: Boolean(),
  nodeContentId: String()
};

/**
 * @interface of GraphModel
 */
YOVALUE.iGraphModel = {
  /**
   *
   * @param nodes - {id:iGraphModelNode, ...}
   * @param edges - {id:iGraphModelEdge, ...}
   * @param nodeTypes {Array.<string>}
   * @param edgeTypes {Array.<string>}
   * @param nodeDefaultType {string}
   * @param edgeDefaultType {string}
   */
  init: function(nodes, edges, nodeTypes, edgeTypes, nodeDefaultType, edgeDefaultType){},
  /**
   * Set if this model can be modified
   * @param v - boolean
   */
  setIsEditable: function(v){},
  getIsEditable: function(){},
  /**
   * @return {*} time in milliseconds of last modification
   */
  getTimestamp: function(){},
  /**
   *
   * @param node - implementation of iGraphModelNode
   * @return {*}
   */
  addNode: function(node){},
  /**
   *
   * @param edge - implementation of iGraphModelEdge
   * @return {*}
   */
  addEdge: function(edge){},
  removeNode: function(id){},
  removeEdge: function(edgeId){},
  /**
   *
   * @param nodeId
   * @param nodeAttributes
   * @return {Boolean}
   */
  updateNode: function(nodeId, nodeAttributes){},
  /**
   *
   * @param edgeId
   * @param edgeAttributes
   * @return {Boolean}
   */
  updateEdge: function(edgeId, edgeAttributes){},
  getNode: function(id){},
  getEdge: function(id){},
  /**
   *
   * @param ids {Array.<number>} opt_argument
   * @returns {*}
   */
  getNodes: function(ids){},
  /**
   *
   * @param ids {Array.<number>} opt_argument
   * @returns {*}
   */
  getEdges: function(ids){},
  getEdgeIdBySrcDst: function(srcNodeId, dstNodeId){},
  getNodeTypes: function(){},
  getEdgeTypes: function(){},
  getEdgeDefaultType: function(){},
  getNodeDefaultType: function(){},
  getGraphName: function(){},
  getGraphId: function(){},
  getNeighbourIds: function(nodeIds){},
  /**
   *
   * @param id - id of node
   * @return {Array}
   */
  getEdgesToChildIds: function (id){},
  /**
   *
   * @param nodeId
   * @return {Array}
   */
  getEdgesFromParentIds: function (nodeId){},
  //Deikstra algorithm (we do not take in to account edge direction in this case - all node neighbours accessible from node)
  getShortestPaths: function(fromNodeId){},
};

/**
 * @interface of GraphModelTree
 */
YOVALUE.iGraphModelTree = {
  /**
   *
   * @param nodes - {id:iGraphModelTreeNode, ...}
   * @param edges - {id:iGraphModelTreeEdge, ...}
   * @param nodeTypes {Array.<string>}
   * @param edgeTypes {Array.<string>}
   * @param nodeDefaultType {string}
   * @param edgeDefaultType {string}
   */
  init: function(nodes, edges, nodeTypes, edgeTypes, nodeDefaultType, edgeDefaultType, isEditable){},
  setIsEditable: function(v){},
  getIsEditable: function(){},
  applyChanges: function(c){},
  getTimestamp: function(){},
  /**
   * Remove node in such a way that tree structure is preserved
   * @param nodeId
   */
  getNode: function(id){},
  getEdge: function(id){},
  /**
   *
   * @param ids {Array.<number>} opt_argument
   * @returns {*}
   */
  getNodes: function(ids){},
  /**
   *
   * @param ids {Array.<number>} opt_argument
   * @returns {*}
   */
  getEdges: function(ids){},
  getEdgeIdBySrcDst: function(srcNodeId, dstNodeId){},
  getNodeTypes: function(){},
  getEdgeTypes: function(){},
  getEdgeDefaultType: function(){},
  getNodeDefaultType: function(){},
  getGraphName: function(){},
  getGraphId: function(){},
  getNeighbourIds: function(nodeIds){},
  /**
   *
   * @param id - id of node
   * @return {Array}
   */
  getEdgesToChildIds: function (nodeId, opt_isSkeleton){},
  getEdgesFromParentIds: function (nodeId, opt_isSkeleton){},
  //Deikstra algorithm (we do not take in to account edge direction in this case - all node neighbours accessible from node)
  getShortestPaths: function(fromNodeId){},
  getRootNode: function(){},
  getLevel: function(node_id){},
  getGraphTreeDepth: function(){},
  /**
   * Get skeleton parent node id
   * @param nodeId
   */
  getParentNodeId: function(nodeId){},
  getPeripheryChildsCount: function(nodeId){},
  /**
   *
   * @param nodeId - id of node
   * @param opt_callCount - used internally to make recursive calls without risk of stack overflow
   * @return {*}
   */
  getAllTreeChildIds: function(nodeId, opt_callCount){},
  /**
   *
   * @param nodeId
   * @return {Array}
   */
  getSkeletonChildIds: function(nodeId){}
};
