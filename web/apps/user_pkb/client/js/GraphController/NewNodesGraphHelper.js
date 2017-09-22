/**
 * This module contains various helper function to deal with pure auxiliary 'newNodes' graph.
 * NewNodesGraph is utility graph - it is used only as a source from which we can drag nodes to create new nodes on real graph.
 * It contains node of every type without edges.
 * @constructor
 */
GRASP.NewNodesGraphHelper = function (publisher, i18n) {
  this.publisher = publisher;
  this.i18n = i18n;
  this.nnGraphViewSettings = {};
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
      var icon = '<svg cursor="pointer" version="1.1" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" style="enable-background:new 0 0 24 24;" xml:space="preserve">\n' +
          '<path fill="none" d="M0,0h24v24H0V0z"/>\n' +
          '<path fill="#2b2f47" d="M12,2C6.5,2,2,6.5,2,12s4.5,10,10,10s10-4.5,10-10S17.5,2,12,2z M17,13h-4v4h-2v-4H7v-2h4V7h2v4h4V13z"/>\n' +
          '<polygon fill="~color~" points="17,13 13,13 13,17 11,17 11,13 7,13 7,11 11,11 11,7 13,7 13,11 17,11 "/>\n' +
          '</svg>';
      for(i in nodeTypes){
        nodes[i] =
        {
          id:i,
          nodeContentId:i,
          label:this.i18n.__(nodeTypes[i]),
          type:nodeTypes[i],
          reliability: 99,
          importance: 100,
          stickers: [],
          icon: icon
        };
      }

      nnGraphViewSettings.graphModel = {nodes: nodes, edges: {}};
      // create color scheme
      var scale = Math.min(nnGraphViewSettings.graphArea.width, nnGraphViewSettings.graphArea.height);
      // we want extra size for the panel nodes
      var size = scale/3;
      // create node mapping
      var x, l = nnGraphViewSettings.graphArea.width/nodeTypes.length, nodeMapping = {};
      for(i in nodeTypes){
        x = i*l+2*size;
        nodeMapping[i] = {id: i, x: x,  y: 0};
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
      nnGraphViewSettings.nodeLabelMapping = GRASP.clone(nnGraphViewSettings.nodeMapping);
      var yOffset = GRASP.convertEm(1)/4;
      var xOffset = GRASP.convertEm(3/2);
      for(var i in nnGraphViewSettings.nodeLabelMapping.mapping){
        nnGraphViewSettings.nodeLabelMapping.mapping[i].y += yOffset;
        nnGraphViewSettings.nodeLabelMapping.mapping[i].x += xOffset;
      }

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

        for (i in nodeTypes) {
          nodes[i].icon = nodes[i].icon.replace('~color~', s.node.attr.typeColors[nodeTypes[i]]);
        }

        that.nnGraphViewSettings = nnGraphViewSettings;
        e.setResponse(nnGraphViewSettings);
      });

    } else if (name == 'is_new_node_graph_id') {
      e.setResponse(this.isNewNodeGraph(e.getData()['graphId']));

    } else if (name == 'get_new_node_graph_area') {
      e.setResponse(this.nnGraphViewSettings.nodeMapping.area);

    }
  },

  isNewNodeGraph: function(graphId){
    return graphId.indexOf('newNodes:') != -1;
  }
};