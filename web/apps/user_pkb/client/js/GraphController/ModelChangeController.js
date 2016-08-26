/**
 * This controller reacts on 'graph_model_changed', 'graph_element_content_changed' events
 * It then collects all necessary data from other modules and combine it to make one 'draw_graph_view' event fire
 * @param publisher
 * @param viewManager
 * @constructor
 */
YOVALUE.ModelChangeController = function(publisher, viewManager){
  this.publisher = publisher;
  this.viewManager = viewManager;
  this.timer = null;
};

YOVALUE.ModelChangeController.prototype = {
  execute: function(event, selectedElement){
    var that = this;
    var eventName = event.getName();

    if(eventName == 'show_graphs' || eventName == 'graph_position_changed'){
      this.publisher.publish(['hide_all_graphs']);
      var graphModels;
      this.publisher.publish("get_graph_models").then(function(models){
        graphModels = models;
        var i, graphIds = [];
        for(i in graphModels) graphIds.push(graphModels[i].getGraphId());
        return that.publisher.publish(['get_selected_positions', graphIds]);

      }).then(function(positions){
        for(var i in graphModels){
          if(positions[graphModels[i].getGraphId()] != 'not to be shown'){
            selectedElement.graphId = graphModels[i].getGraphId();
            that.showGraph(graphModels[i]);
          }
        }
      });

    }else if(eventName == 'graph_model_changed'){
      var graphModel = event.getData()['graphModel'];
      selectedElement.graphId = graphModel.getGraphId();
      this.showGraph(graphModel);

    }else if(eventName == 'graph_element_content_changed'){
      if(event.getData()['type'] == 'updateNodeText' ||         // nothing to redraw if node content text was changed
          event.getData()['type'] ==  'addEdge' ||              // no need to redraw - it will be done by 'graph_model_changed' event
          event.getData()['type'] == 'addNode')                 // no need to redraw - it will be done by 'graph_model_changed' event
          return true;

      // plan update after current js function call stack finishes (we don't want to pause user input by our graph updates)
      var timeout = 0;
      if(event.getData()['type'] ==  'updateNodeAttribute' && event.getData()['nodeAttribute']['name'] == 'label') timeout = 500;

      clearTimeout(this.timer);
      var graphId = event.getData()['graphId'];
      this.timer = setTimeout(function(){
        that.publisher.publish(["get_graph_models", [graphId]]).then(function(graphModels){
          that.showGraph(graphModels[graphId]);
        });
      },timeout);
    }
  },

  /**
   *
   * @param graphModel
   */
  showGraph: function(graphModel){
    console.log('=======================showGraph');
    // Choose left or right side of canvas for this GraphView
    var that = this;
    this.publisher
      .publish(["get_selected_positions", [graphModel.getGraphId()]])
      .then(function(graphPositions){
        var graphArea = that.viewManager.getViewContainer(graphPositions[graphModel.getGraphId()]);

        if (!graphModel.getIsEditable()) {
          that._drawGraphView(graphModel, graphArea);
        } else {
          // We want to fit in graphArea 2 graphs:
          // - original graphModel
          // - nnGraph (new nodes graph) - graph that user can use as a source of the new nodes for original graph

          // Cut some space for nnGraph area
          var newNodesGraphHeight = 0.07 * graphArea.height,
              nnGraphArea = {
                centerX: graphArea.centerX,
                centerY: newNodesGraphHeight / 2,
                width: graphArea.width,
                height: newNodesGraphHeight
              };
          that._drawNodesPanel(graphModel, nnGraphArea);

          // Calculate area for original graph
          graphArea.height = graphArea.height - nnGraphArea.height;
          graphArea.centerY = graphArea.centerY + nnGraphArea.height;
          // Create data nnGraph view
          that._drawGraphView(graphModel, graphArea);
        }
      });
  },

  /**
   * Get data to init graphView for the graphModel
   * @param graphModel
   * @param graphArea
   * @returns {{graphId: *, graphModel: {nodes: *, edges: *}, graphArea: *, nodeMapping: *, nodeLabelMapping: *, decoration: *, skin: *}}
   * @private
   */
  _drawGraphView: function(graphModel, graphArea){
    var i, that = this, skin, layout, graphNodeAttributes, graphEdgeAttributes, nodeMapping,
      nodeMappingHint, decoration, graphNodes = graphModel.getNodes(),
      nodeLabels = {}, nodeLabelAreaList, nodeId, nodeContentIds=[], edgeContentIds=[];

    var graphId = graphModel.getGraphId();
    for(i in graphModel.getNodes()) nodeContentIds.push(graphModel.getNodes()[i].nodeContentId);
    for(i in graphModel.getEdges()) edgeContentIds.push(graphModel.getEdges()[i].edgeContentId);
    this.publisher
      .publish(["get_selected_skin", graphId],
        ["get_selected_layout", graphId],
        ["get_elements_attributes", {nodes:nodeContentIds, edges:edgeContentIds}])
      .then(function(s, l, c){
          skin = s;
          layout = l;

          // c['nodes'] gives us attributes for alternatives, but we need only for active alternative
          // - so cut off all others here
          graphNodeAttributes = YOVALUE.clone(c['nodes']);
          for(var i in graphNodeAttributes){
            var nodeAttributes = graphNodeAttributes[i];
            for(var j in nodeAttributes['alternatives'][nodeAttributes['active_alternative_id']]){
              graphNodeAttributes[i][j] = nodeAttributes['alternatives'][nodeAttributes['active_alternative_id']][j];
            }
            delete graphNodeAttributes[i]['alternatives'];
          }
        //  console.log(YOVALUE.clone(graphNodeAttributes));
          graphEdgeAttributes = c['edges'];

          // Decorate nodes and edges with size and color
          decoration = that.publisher.getInstant("get_graph_decoration", {
              graphModel:{nodes:graphModel.getNodes(), edges:graphModel.getEdges()},
              graphNodeAttributes:graphNodeAttributes,
              graphEdgeAttributes:graphEdgeAttributes,
              scale:Math.min(graphArea.width, graphArea.height),
              skin:skin
            }
          );

          // Create node label layout for GraphView
          for(nodeId in graphNodes){
            nodeLabels[graphNodes[nodeId].id] = {
              id: graphNodes[nodeId].id,
              label: graphNodeAttributes[graphNodes[nodeId].nodeContentId].label,
              size: decoration.nodeLabels[nodeId].size
            };
          }
          nodeLabelAreaList = that.publisher.getInstant("get_graph_view_label_area", {
            nodeLabels:nodeLabels,
            skin:skin
          });
          nodeMappingHint = that.publisher.getInstant("graph_history_get_node_mapping", {
            graphId:graphModel.getGraphId()
          });

          // Create node layout for GraphView
          nodeMapping = that.publisher.getInstant("get_node_mapping", {
            graphId:graphModel.getGraphId(),
            model:{nodes:graphModel.getNodes(), edges:graphModel.getEdges()},
            hint:nodeMappingHint,
            layout:layout,
            nodeLabelAreaList:nodeLabelAreaList,
            area:graphArea
          });

          // If node mapping module actually changed nodeMappingHint, then save it in repository
          // (so next time we will not make node mapping module working again)
          if(!YOVALUE.deepCompare(nodeMapping, nodeMappingHint)) that.publisher.publish(["node_mapping_changed", {graphId: graphId, node_mapping: nodeMapping}]);

          // Create from graphNode and graphNodeAttributes nodes that GraphView is waiting from us - see implementation of YOVALUE.iGraphViewModel
          var graphViewSettings = {
              graphId:graphModel.getGraphId(),
              graphModel:{nodes:graphModel.getNodes(), edges:graphModel.getEdges()},
              skin:skin,
              layout:layout,
              graphNodeAttributes:graphNodeAttributes,
              graphEdgeAttributes:graphEdgeAttributes,
              decoration:decoration,
              nodeMapping:nodeMapping,
              dragMode:'move'
          };

          that.publisher.publish(["draw_graph_view", graphViewSettings]);

          // hide ajax loader
          that.viewManager.hideAjaxLoader();
      });
  },

  // get data to init mini-graphView that draws just node types of the graphModel
  _drawNodesPanel: function(graphModel, graphArea){
    var that = this,
      i,
      nnGraphViewSettings = {},
      nodeTypes = graphModel.getNodeTypes(),
      nodes = {},
      graphId = graphModel.getGraphId();

    // get height of new nodes graph
   // nnGraphViewSettings.eventsToListen = ['dragendnode'];
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
        importance: 50
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

      that.publisher.publish(["draw_graph_view", nnGraphViewSettings]);
    });

  }

};
