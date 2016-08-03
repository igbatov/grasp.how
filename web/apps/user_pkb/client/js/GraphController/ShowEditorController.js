YOVALUE.ShowEditorController = function(publisher){
  this.publisher = publisher;
  this.isElementEditorFocused = false;
};

YOVALUE.ShowEditorController.prototype = {
  execute: function(event, selectedElement){
    var eventName = event.getName();

    if(eventName === 'mouseenternode'){
      this._showNodeEditor(event.getData().graphId, event.getData().element.id, event.getData().element.nodeContentId);
    }else if(eventName === 'mouseenteredge'){
      this._showEdgeEditor(event.getData().graphId, event.getData().element);
    }else if(eventName === 'clickbackground' || eventName === 'mouseleavenode' || eventName === 'mouseleaveedge' || eventName == 'dragstartnode'){
      if(selectedElement.element != null) {
        if(selectedElement.elementType === "node")  this._showNodeEditor(selectedElement.graphId, selectedElement.element.id, selectedElement.element.nodeContentId);
        if(selectedElement.elementType === "edge")  this._showEdgeEditor(selectedElement.graphId, selectedElement.element);
      }else{
        this.publisher.publish(["hide_graph_element_editor", selectedElement]);
      }
    }else if(eventName === 'graph_element_content_changed'){
      //if(['addAlternative'].indexOf(event.getData()['type'])!=-1) if(selectedElement.element) this._showNodeEditor(event.getData().graphId, selectedElement.element.id, selectedElement.element.nodeContentId);
    }else if(eventName === 'clicknode'){
      this._showNodeEditor(selectedElement.graphId, selectedElement.element.id, selectedElement.element.nodeContentId);
    }else if(eventName === 'clickedge'){
      this._showEdgeEditor(selectedElement.graphId, selectedElement.element);
    }else if(eventName === 'element_editor_focusin'){
      this.isElementEditorFocused = true;
    }else if(eventName === 'element_editor_focusout'){
      this.isElementEditorFocused = false;
    }
  },

  _showNodeEditor: function(graphId, nodeId, nodeContentId){
    var that = this;
    this.publisher
      .publish(["get_graph_models", [graphId]],
            ["get_selected_positions", [graphId]])
      .then(function(graphModels, positions){
          if(typeof(graphModels[graphId]) == 'undefined') return true;
            var graphModel = graphModels[graphId];
            that.publisher.publish(["show_graph_element_editor", {
              graphId: graphId,
              position: positions[graphId],
              isEditable: graphModel.getIsEditable(),
              elementType: 'node',
              nodeId: nodeId,
              nodeContentId: nodeContentId,
              nodeTypes: graphModel.getNodeTypes()
            }]);
      });
  },

  _showEdgeEditor: function(graphId, edge){
    var that = this;

    this.publisher
      .publish(["get_graph_models", [graphId]],
            ["get_selected_positions", [graphId]])
      .then(function(graphModels, positions){
            var graphModel = graphModels[graphId];
            that.publisher.publish(["show_graph_element_editor", {
              graphId: graphId,
              position: positions[graphId],
              isEditable: graphModel.getIsEditable(),
              elementType: 'edge',
              edge: {id: edge.id, type: edge.type, edgeContentId: edge.edgeContentId, label: edge.label},
              edgeTypes: graphModel.getEdgeTypes()
            }]);
      });
  }
};