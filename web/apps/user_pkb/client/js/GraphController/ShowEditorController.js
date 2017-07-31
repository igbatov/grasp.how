/**
 * This module process events like
 * 'clicknode', 'clickedge', 'clickbackground', 'mouseenternode', 'mouseenteredge'
 * to change graph decoration
 */
GRASP.ShowEditorController = function(publisher){
  this.publisher = publisher;
  this.isElementEditorFocused = false;
};

GRASP.ShowEditorController.prototype = {
  execute: function(event, selectedElement){
    var eventName = event.getName();

    if(eventName === 'mouseenternode' && !selectedElement.element){
      this._showNodeEditor(event.getData().graphId, event.getData().element.id, event.getData().element.nodeContentId);
    }else if(eventName === 'mouseenteredge' && !selectedElement.element){
      this._showEdgeEditor(event.getData().graphId, event.getData().element);
    }else if(eventName === 'clickbackground' && selectedElement.element) {
      this.publisher.publish(["hide_graph_element_editor", selectedElement]);
    }else if(
        eventName === 'mouseleavenode'
        || eventName === 'mouseleaveedge'
        || eventName == 'dragstartnode'
    ){
      if(!selectedElement.element) {
        this.publisher.publish(["hide_graph_element_editor", selectedElement]);
      }
    }else if(eventName === 'graph_element_content_changed'){
      //if(['addAlternative'].indexOf(event.getData()['type'])!=-1) if(selectedElement.element) this._showNodeEditor(event.getData().graphId, selectedElement.element.id, selectedElement.element.nodeContentId);
    }else if(eventName === 'clicknode' && !selectedElement.element){
      this._showNodeEditor(selectedElement.graphId, selectedElement.element.id, selectedElement.element.nodeContentId);
    }else if(eventName === 'clickedge' && !selectedElement.element){
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
      .publish(
          ["get_graph_models", [graphId]],
          ["get_selected_positions", [graphId]],
          ["get_selected_skin", graphId]
      )
      .then(function(graphModels, positions, skin){
          if(typeof(graphModels[graphId]) == 'undefined') return true;
            var graphModel = graphModels[graphId];
            that.publisher.publish(["show_graph_element_editor", {
              graphId: graphId,
              position: positions[graphId],
              isEditable: graphModel.getIsEditable(),
              elementType: 'node',
              nodeId: nodeId,
              nodeContentId: nodeContentId,
              nodeTypes: skin['node']['attr']['typeColors']
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