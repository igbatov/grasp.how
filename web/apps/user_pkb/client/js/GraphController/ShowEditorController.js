YOVALUE.ShowEditorController = function(publisher){
  this.publisher = publisher;
  this.isElementEditorFocused = false;
};

YOVALUE.ShowEditorController.prototype = {
  execute: function(event, selectedElement){
    var eventName = event.getName();

    if(eventName === 'mouseenternode'){
      this._showNodeEditor(event.getData().graphId, event.getData().element);
    }else if(eventName === 'mouseenteredge'){
      this._showEdgeEditor(event.getData().graphId, event.getData().element);
    }else if(eventName === 'clickbackground' || eventName === 'mouseleavenode' || eventName === 'mouseleaveedge' || eventName == 'dragstartnode'){
      if(selectedElement.element != null) {
        if(selectedElement.elementType === "node")  this._showNodeEditor(selectedElement.graphId, selectedElement.element);
        if(selectedElement.elementType === "edge")  this._showEdgeEditor(selectedElement.graphId, selectedElement.element);
      }else{
        this.publisher.publish("hide_graph_element_editor", selectedElement);
      }
    }else if(eventName === 'clicknode'){
      this._showNodeEditor(selectedElement.graphId, selectedElement.element);
    }else if(eventName === 'clickedge'){
      this._showEdgeEditor(selectedElement.graphId, selectedElement.element);
    }else if(eventName === 'element_editor_focusin'){
      this.isElementEditorFocused = true;
    }else if(eventName === 'element_editor_focusout'){
      this.isElementEditorFocused = false;
    }
  },

  _showNodeEditor: function(graphId, node){
    var that = this,
      e1 = this.publisher.createEvent("get_elements_attributes", {edges:[], nodes:[node.nodeContentId]}),
      e2 = this.publisher.createEvent("get_graph_models", [graphId]),
      e3 = this.publisher.createEvent("get_selected_positions", [graphId]),
      parentEdges,
      nodes,
      positions,
      graphModel;

    this.publisher.when(e1, e2, e3).then(function(elementsAttributes, graphModels, p){
      if(typeof(graphModels[graphId]) == 'undefined') return true;
        graphModel = graphModels[graphId];
        parentEdges = graphModel.getEdges(graphModel.getEdgesFromParentIds(node.id));
        nodes = graphModel.getNodes();
        positions = p;
        var i, nodeContentIds = [];

        for(i in parentEdges){
          nodeContentIds.push(nodes[parentEdges[i].source].nodeContentId);
        }

        return that.publisher.publish('get_elements_attributes', {edges:[], nodes:nodeContentIds});
    }).then(function(elementsAttributes){
        var i, parentNodeAttributes = {};
      for(i in parentEdges){
        parentNodeAttributes[parentEdges[i].source] = elementsAttributes['nodes'][nodes[parentEdges[i].source].nodeContentId];
      }

      that.publisher.publish("show_graph_element_editor", {
        graphId: graphId,
        position: positions[graphId],
        isEditable: graphModel.getIsEditable(),
        elementType: 'node',
        node: node,
        parentEdges: parentEdges,
        parentNodeAttributes: parentNodeAttributes,
        nodeTypes: graphModel.getNodeTypes()
      });

    });
    this.publisher.publishEvent(e1, e2, e3);
  },

  _showEdgeEditor: function(graphId, edge){
    var that = this,
      e1 = this.publisher.createEvent("get_elements_attributes", {edges:[edge.edgeContentId], nodes:[]}),
      e2 = this.publisher.createEvent("get_graph_models", [graphId]),
      e3 = this.publisher.createEvent("get_selected_positions", [graphId]);

    this.publisher.when(e1, e2, e3).then(function(elementsAttributes, graphModels, positions){
      var graphModel = graphModels[graphId];
      that.publisher.publish("show_graph_element_editor", {
        graphId: graphId,
        position: positions[graphId],
        isEditable: graphModel.getIsEditable(),
        elementType: 'edge',
        edge: {id: edge.id, type: edge.type, edgeContentId: edge.edgeContentId, label: elementsAttributes['edges'][edge.edgeContentId].label},
        edgeTypes: graphModel.getEdgeTypes()
      });
    });
    this.publisher.publishEvent(e1, e2, e3);

  }
};