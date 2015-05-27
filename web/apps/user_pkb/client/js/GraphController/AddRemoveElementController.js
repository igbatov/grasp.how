/**
 * This controller reacts on node's drag'n'drop in 'copy' mode.
 * On 'dragendnode' it starts process of model change
 * This started process would be finished somewhere else with 'graph_model_changed' event fire 
 * @param publisher
 * @constructor
 */
YOVALUE.AddRemoveElementController = function(publisher){
  this.publisher = publisher;
};

YOVALUE.AddRemoveElementController.prototype = {
  execute: function(event, selectedElement){
    var that = this, eventName = event.getName(), dragMode, acceptedEvents = ['dragendnode', 'delete_pressed', 'element_editor_focusin', 'element_editor_focusout'];

    // reject in the explicit form all events except those in acceptedEvents
    if(acceptedEvents.indexOf(eventName) == -1) return;

    // we work with dragendnode only if the mode of dragging is 'copy'
    if(eventName == 'dragendnode'){
      dragMode = this.publisher.publishResponseEvent(this.publisher.createEvent('get_graph_view_drag_mode', {graphId: event.getData()['fromGraphId']}));
      if(dragMode != 'copy') return;
    }

    if(eventName === 'dragendnode'){
      var data = event.getData();

      // if dragged node is from the droppedOnGraphId then add new edge between dragged node and dropped node
      if(data['fromGraphId'] == data['droppedOnGraphId']){
        // if it was dropped on background of graph, do nothing
        if(typeof(data['droppedOnModelElement']) === 'undefined') return;

        // do not add double edge between nodes
        if(data['droppedOnModelElement'].element.id == data['draggedModelElement'].element.id) return;

        var e = this.publisher.createEvent("get_graph_models", [data['droppedOnGraphId']]);
        this.publisher.when(e).then(function(graphModels){
          var graphModel = graphModels[data['droppedOnGraphId']];
          return that.publisher.publish("request_for_graph_element_content_change", {type: 'addEdge', graphId: data['droppedOnGraphId'], elementType: graphModel.getEdgeDefaultType()});

        }).then(function(edgeContent){
            return that.publisher.publish("request_for_graph_model_change", {graphId: data['droppedOnGraphId'], type: 'addEdge', edgeContentId:edgeContent.edgeContentId, fromNodeId:data['droppedOnModelElement'].element.id, toNodeId:data['draggedModelElement'].element.id});
        });
        this.publisher.publishEvent(e);

      // else add new node to graph
      }else{
        var graphId = data['droppedOnGraphId'];
        var e1 = this.publisher.createEvent("get_graph_models", [data['droppedOnGraphId']]);
        if(this.isFromNewNodeGraph(data['fromGraphId'])) data['draggedModelElement'].element.nodeContentId = null;

        var e2 = that.publisher.createEvent("request_for_graph_element_content_change", {type: 'addNode', graphId: data['droppedOnGraphId'], element: data['draggedModelElement'].element});
        this.publisher.when(e1, e2).then(function(graphModels, nodeContent){
          var graphModel = graphModels[data['droppedOnGraphId']];
          // if node was dropped on background add it as a child to the root node
          var parentNodeId = typeof(data['droppedOnModelElement']) === 'undefined' ? graphModel.getRootNode().id : data['droppedOnModelElement'].element.id;
          that.publisher.publish("request_for_graph_model_change", {graphId: graphId, type: 'addNode', parentNodeId: parentNodeId, nodeContentId: nodeContent.nodeContentId});
        });
        this.publisher.publishEvent(e1, e2);
      }

    }else if(eventName === 'delete_pressed'){
      // if focus is on test editor do nothing
      if(this.isElementEditorFocused) return;

      // else
      if(selectedElement){
        if(selectedElement.elementType == 'node'){
          this.publisher.publish("request_for_graph_model_change", {graphId: selectedElement.graphId, type: 'removeNode', elementId: selectedElement.element.id});
        }else if(selectedElement.elementType == 'edge'){
          //TODO: if edge is skeleton, then move skeleton attribute to other appropriate edge if any. If there is no such edge, fire warning "Cannot remove single edge, please create another edge first!"
          this.publisher.publish("request_for_graph_model_change", {graphId: selectedElement.graphId, type: 'removeEdge', elementId: selectedElement.element.id});
        }
      }

    }else if(eventName === 'element_editor_focusin'){
      this.isElementEditorFocused = true;

    }else if(eventName === 'element_editor_focusout'){
      this.isElementEditorFocused = false;

    }
  },

  isFromNewNodeGraph: function(graphId){
    return graphId.indexOf('newNodes') != -1;
  }
};