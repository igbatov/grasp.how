/**
 * This module process events like
 * 'clicknode', 'clickedge', 'mouseenternode', 'mouseenteredge', 'mouseleavenode', 'mouseleaveedge'
 * @param publisher
 * @constructor
 */
YOVALUE.SelectElementController = function(publisher){
  this.publisher = publisher;
  this.initialDecoration = {};   // decoration before node or edge selection
  this.selectedDecoration = {};  // decoration after selection
  this.nodeScale = 1.3;
  this.nodeLabelScale = 1.4;
  this.edgeScale = 2;
  this.lowOpacityValue = 0.2;
};

YOVALUE.SelectElementController.prototype = {
  execute: function(event, selectedElement){
    var i, that = this,
    eventName = event.getName(),
    e = event.getData() ? event.getData().element : undefined;

    if(
      eventName == 'draw_graph_view'
    ){
      graphId = event.getData()['graphId'];

      if(typeof(event.getData().decoration) != 'undefined') that.initDecorations(graphId, event.getData().decoration);

      if(selectedElement && selectedElement.element){
        that.selectedDecoration[graphId] = that.enlargeNodes(that.initialDecoration[graphId], [selectedElement.element.id]);
        graphViewSettings = {
          graphId: graphId,
          decoration: that.selectedDecoration[graphId]
        };
        that.publisher.publish(["update_graph_view_decoration", graphViewSettings]);
      }
    }

    if(eventName === 'clicknode' ||
        eventName === 'clickedge' ||
        eventName === 'mouseenternode' ||
        eventName === 'mouseenteredge'){
      var graphId = event.getData().graphId;

      if(eventName === 'clicknode' || eventName === 'clickedge'){
        selectedElement.graphId = graphId;
        selectedElement.elementType = event.getData().elementType;
        selectedElement.element = event.getData().element;
      }
      // determine node that must be somehow highlighted
      var nodesToSelect = [];
      var edgesToSelect = [];

      if(eventName === 'clicknode') nodesToSelect = [e.id];

      if(eventName === 'mouseenternode'){
        var model = this.publisher.getInstant('get_graph_models', [graphId])[graphId];
        nodesToSelect = [e.id];
        nodesToSelect = nodesToSelect.concat(model.getNeighbourIds([e.id]));
        edgesToSelect = model.getNeighbourEdgeIds(e.id);
      }

      if(eventName === 'clickedge' || eventName === 'mouseenteredge') edgesToSelect = [e.id];

      // now highlight them depending on event type
      if(eventName === 'mouseenternode'){
        this.selectedDecoration[graphId] = this.lowerOpacity(that.initialDecoration[graphId], nodesToSelect, edgesToSelect, true);
      }
      if(eventName === 'clicknode') this.selectedDecoration[graphId] = this.enlargeNodes(that.initialDecoration[graphId], nodesToSelect);
      if(eventName === 'clickedge') this.selectedDecoration[graphId] = this.enlargeEdges(that.initialDecoration[graphId], edgesToSelect);

      var graphViewSettings = {
        graphId: graphId,
        decoration: this.selectedDecoration[graphId]
      };

      this.publisher.publish(["update_graph_view_decoration", graphViewSettings]);

    }else if(eventName === 'mouseleavenode' || eventName === 'mouseleaveedge' || eventName === 'clickbackground'){
      graphId = event.getData().graphId;
      if(typeof(this.initialDecoration[graphId]) == 'undefined') return;

      if(eventName === 'clickbackground'){
        this.nullSelectedElement(selectedElement, graphId);
        this.selectedDecoration[graphId] = this.initialDecoration[graphId];
      }

      if(eventName === 'mouseleavenode'){
        this.restoreOpacity(graphId);
      }

      var graphViewSettings = {
        graphId: graphId,
        decoration: this.selectedDecoration[graphId],
      };

      this.publisher.publish(["update_graph_view_decoration", graphViewSettings]);

    }
    else if(eventName == 'graph_model_changed'){
      var graphModel = event.getData().graphModel;
      var graphId = graphModel.getGraphId();

      // update selectedElement if any
      if(selectedElement.element !== null && selectedElement.graphId == graphId){
        var elements = selectedElement.elementType == 'node' ? graphModel.getNodes() : graphModel.getEdges();

        // update selectedElement.element if it was not removed
        if(typeof(elements[selectedElement.element.id]) !== 'undefined'){
          selectedElement.element = elements[selectedElement.element.id];
        }
        // if removed make it null
        else{
          this.nullSelectedElement(selectedElement, event.getData().graphId);
        }
      }

    }
  },

  nullSelectedElement: function(selectedElement, graphId){
    selectedElement.elementType = null;
    selectedElement.element = null;
    selectedElement.graphId = graphId;
    this.publisher.publish(["hide_graph_element_editor",{}]);
  },

  enlargeEdges: function(d, edgeIds){
    var i, id, decoration = YOVALUE.clone(d);
    for(i in edgeIds){
      id = edgeIds[i];
      decoration.edges[id].width = this.edgeScale*Math.max(1, d.edges[id].width);
    }
    return decoration;
  },

  enlargeNodes: function(d, nodeIds){
    var i, id, decoration = YOVALUE.clone(d);
    for(i in nodeIds){
      id = nodeIds[i];
      decoration.nodes[id].size = this.nodeScale*d.nodes[id].size;
      decoration.nodeLabels[id].size = this.nodeLabelScale*d.nodeLabels[id].size;
    }
    return decoration;
  },

  lowerOpacity: function(d, nodeIds, edgeIds, do_reverse){
    var newNodeOpacity, newLabelOpacity, newEdgeOpacity, id, decoration = YOVALUE.clone(d);

    for(id in d.nodes){
      id = parseInt(id);
      if(do_reverse){
        newNodeOpacity = nodeIds.indexOf(id) == -1 ? this.lowOpacityValue : d.nodes[id].opacity;
        newLabelOpacity = nodeIds.indexOf(id) == -1 ? this.lowOpacityValue : d.nodeLabels[id].opacity;
      }
      else{
        newNodeOpacity = nodeIds.indexOf(id) == -1 ? d.nodes[id].opacity : this.lowOpacityValue;
        newLabelOpacity = nodeIds.indexOf(id) == -1 ? d.nodeLabels[id].opacity : this.lowOpacityValue;
      }
      decoration.nodes[id].opacity = newNodeOpacity;
      decoration.nodeLabels[id].opacity = newLabelOpacity;
    }

    for(id in d.edges){
      id = parseInt(id);
      if(do_reverse) newEdgeOpacity = edgeIds.indexOf(id) == -1 ? this.lowOpacityValue : d.edges[id].opacity;
      else newEdgeOpacity = edgeIds.indexOf(id) == -1 ? d.edges[id].opacity : this.lowOpacityValue;
      decoration.edges[id].opacity = newEdgeOpacity;
    }

    return decoration;
  },

  restoreOpacity: function(graphId){
    var id;
    for(id in  this.selectedDecoration[graphId].nodes){
      this.selectedDecoration[graphId].nodes[id].opacity = this.initialDecoration[graphId].nodes[id].opacity;
      this.selectedDecoration[graphId].nodeLabels[id].opacity = 1;//this.initialDecoration[graphId].nodes[id].opacity;
    }

    for(id in this.selectedDecoration[graphId].edges){
      this.selectedDecoration[graphId].edges[id].opacity = this.initialDecoration[graphId].edges[id].opacity;
    }
  },

  initDecorations: function(graphId, decoration){
    var that = this;
    that.initialDecoration[graphId] = decoration;
  }
};