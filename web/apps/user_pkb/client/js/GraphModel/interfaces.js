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

  getAttributes: function(){},
  setAttribute: function(name, v){},
  getAttribute: function(){},

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