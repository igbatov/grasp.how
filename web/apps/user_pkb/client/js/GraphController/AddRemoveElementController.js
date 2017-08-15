/**
 * This controller reacts on node's drag'n'drop in 'connect' mode.
 * On 'dragendnode' it starts process of model change
 * This started process would be finished somewhere else with 'graph_model_changed' event fire 
 * @param publisher
 * @constructor
 */
GRASP.AddRemoveElementController = function(publisher){
  this.publisher = publisher;
  this.FROM_DRAGGED = 'fromDragged';
  this.TO_DRAGGED = 'toDragged';
};

GRASP.AddRemoveElementController.prototype = {
  execute: function(event, selectedElement){
    var that = this, eventName = event.getName(), dragMode, acceptedEvents = ['dragendnode', 'delete_pressed', 'element_editor_focusin', 'element_editor_focusout'];

    // reject in the explicit form all events except those in acceptedEvents
    if(acceptedEvents.indexOf(eventName) == -1) return;

    // we work with dragendnode only if the mode of dragging is 'connect'
    if(eventName == 'dragendnode'){
      dragMode = this.publisher.getInstant('get_graph_view_drag_mode', {graphId: event.getData()['fromGraphId']});
      if(dragMode != 'connect') {
        return;
      }
    }

    if(eventName === 'dragendnode'){
      var data = event.getData();

      // if dragged node is from the droppedOnGraphId then add new edge between dragged node and dropped node
      if(data['fromGraphId'] == data['droppedOnGraphId']){
        // if it was dropped on background of graph, do nothing
        if(typeof(data['droppedOnModelElement']) === 'undefined') {
          return;
        }

        // do not add double edge between nodes
        if(data['droppedOnModelElement'].element.id == data['draggedModelElement'].element.id) {
          return;
        }

        this.publisher.publish(["get_graph_models", [data['droppedOnGraphId']]]).then(function(graphModels){
          var graphModel = graphModels[data['droppedOnGraphId']];
          return that.publisher.publish(
            ["request_for_graph_element_content_change",
              {
                type: 'addEdge',
                graphId: data['droppedOnGraphId'],
                elementType: graphModel.getEdgeDefaultType()
              }
            ]
          );

        }).then(function(edgeContent){
          var direction = that._getEdgeDirection(
              data['draggedModelElement'].element.type,
              data['droppedOnModelElement'].element.type
          );

          if (direction === that.FROM_DRAGGED) {
            return that.publisher.publish(
                ["request_for_graph_model_change",
                  {
                    graphId: data['droppedOnGraphId'],
                    type: 'addEdge',
                    edgeContentId:edgeContent.edgeContentId,
                    fromNodeId:data['draggedModelElement'].element.id,
                    toNodeId:data['droppedOnModelElement'].element.id
                  }
                ]
            );
          } else {
            return that.publisher.publish(
                ["request_for_graph_model_change",
                  {
                    graphId: data['droppedOnGraphId'],
                    type: 'addEdge',
                    edgeContentId:edgeContent.edgeContentId,
                    fromNodeId:data['droppedOnModelElement'].element.id,
                    toNodeId:data['draggedModelElement'].element.id
                  }
                ]
            );
          }
        });

      // else add new node to graph
      }else{
        var graphId = data['droppedOnGraphId'];

        if(typeof(graphId) == 'undefined') {
          GRASP.errorHandler.throwError('no droppedOnGraphId');
        }

        if(that.publisher.getInstant("is_new_node_graph_id", {'graphId':data['fromGraphId']})) {
          data['draggedModelElement'].element.nodeContentId = null;
        }
        this.publisher
          .publish(["get_graph_models", [data['droppedOnGraphId']]],
            ["request_for_graph_element_content_change",
              {
                type: 'addNode',
                graphId: data['droppedOnGraphId'],
                element: data['draggedModelElement'].element
              }
            ]
          ).then(function(graphModels, nodeContent){
            var connectWithNodeId = typeof(data['droppedOnModelElement']) === 'undefined' ? null : data['droppedOnModelElement'].element.id;
            var droppedOnModelElementType = typeof(data['droppedOnModelElement']) === 'undefined' ? null : data['droppedOnModelElement'].element.type;
            var direction = that._getEdgeDirection(
                nodeContent.type,
                droppedOnModelElementType
            );
            if (direction === that.FROM_DRAGGED){
              that.publisher.publish(
                  ["request_for_graph_model_change",
                    {
                      graphId: graphId,
                      type: 'addNode',
                      childNodeId: connectWithNodeId,
                      nodeContentId: nodeContent.nodeContentId
                    }
                  ]
              );
            } else {
              that.publisher.publish(
                  ["request_for_graph_model_change",
                    {
                      graphId: graphId,
                      type: 'addNode',
                      parentNodeId: connectWithNodeId,
                      nodeContentId: nodeContent.nodeContentId
                    }
                  ]
              );
            }
          }
        );
      }

    }else if(eventName === 'element_editor_focusin'){
      this.isElementEditorFocused = true;

    }else if(eventName === 'element_editor_focusout'){
      this.isElementEditorFocused = false;

    }
  },

  /**
   * This method encapsulates choice of edge direction between two nodes.
   * Returns 'fromDragged' if edge from draggedNode to droppedNode must be created.
   * Returns 'toDragged' otherwise.
   * @param draggedNodeType
   * @param droppedOnNodeType
   * @returns {*}
   * @private
   */
  _getEdgeDirection: function(draggedNodeType, droppedOnNodeType){
    if (
        draggedNodeType === GRASP.GraphViewNode.NODE_TYPE_FACT
        && droppedOnNodeType === GRASP.GraphViewNode.NODE_TYPE_PROPOSITION
    ) {
      return this.TO_DRAGGED;
    }

    if (
        draggedNodeType === GRASP.GraphViewNode.NODE_TYPE_PROPOSITION
        && droppedOnNodeType === GRASP.GraphViewNode.NODE_TYPE_FACT
    ) {
      return this.FROM_DRAGGED;
    }

    return this.TO_DRAGGED;
  }
};