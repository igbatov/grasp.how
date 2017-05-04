/**
 * This module contains various helper function to deal with pure auxiliary 'newNodes' graph.
 * NewNodesGraph is utility graph - it is used only as a source from which we can drag nodes to create new nodes on real graph.
 * It contains node of every type without edges.
 * @constructor
 */
GRASP.NewNodesGraphHelper = function (publisher) {
  this.publisher = publisher;
};

GRASP.NewNodesGraphHelper.prototype = {
  eventListener: function(e) {
    var that = this;
    var name = e.getName();

    if (name == 'get_new_nodes_graph_view_settings') {
      var i,
          graphModel = e.getData()['graphModel'],
          graphArea = e.getData()['graphArea'],
          nnGraphViewSettings = {},
          nodeTypes = graphModel.getNodeTypes(),
          nodes = {},
          graphId = graphModel.getGraphId();

      // get height of new nodes graph
      nnGraphViewSettings.graphArea = graphArea;
      nnGraphViewSettings.graphId = 'newNodes:' + graphId;
      nnGraphViewSettings.dragMode = 'connect';

      // create node for each nodeType
      for(i in nodeTypes){
        nodes[i] =
        {
          id:i,
          nodeContentId:i,
          label:nodeTypes[i],
          type:nodeTypes[i],
          reliability: 99,
          importance: 50,
          stickers: []
        };
      }

      nnGraphViewSettings.graphModel = {nodes: nodes, edges: {}};
      // create color scheme
      var scale = Math.min(nnGraphViewSettings.graphArea.width, nnGraphViewSettings.graphArea.height);
      // we want extra size for the panel nodes
      var size = scale/6;
      // create node mapping
      var x, l = nnGraphViewSettings.graphArea.width/nodeTypes.length, nodeMapping = {};
      for(i in nodeTypes){
        x = i*l+2*size;
        nodeMapping[i] = {id: i, x: x,  y: nnGraphViewSettings.graphArea.height/2};
      }
      nnGraphViewSettings.nodeMapping = {
        area: {
          centerX: nnGraphViewSettings.graphArea.width/2,
          centerY: nnGraphViewSettings.graphArea.height/2,
          width: nnGraphViewSettings.graphArea.width,
          height: nnGraphViewSettings.graphArea.height
        },
        mapping: nodeMapping
      };
      // node label mapping
      nnGraphViewSettings.nodeLabelMapping = nnGraphViewSettings.nodeMapping;

      // skin
      this.publisher.publish(["get_selected_skin", graphId]).then(function(s){
        nnGraphViewSettings.skin = s;

        nnGraphViewSettings.decoration = that.publisher.getInstant("get_graph_decoration", {
          graphModel: {nodes: nodes, edges: {}},
          graphNodeAttributes:nodes,
          graphEdgeAttributes:{},
          scale:scale,
          skin:nnGraphViewSettings.skin
        });

        for(i in nnGraphViewSettings.decoration.nodes){
          nnGraphViewSettings.decoration.nodes[i].size = size;
          nnGraphViewSettings.decoration.nodeLabels[i].size = 2*size;
        }

        e.setResponse(nnGraphViewSettings);
      });

    } else if (name == 'is_new_node_graph_id') {
      e.setResponse(this.isNewNodeGraph(e.getData()['graphId']));
    }
  },

  isNewNodeGraph: function(graphId){
    return graphId.indexOf('newNodes:') != -1;
  }
};