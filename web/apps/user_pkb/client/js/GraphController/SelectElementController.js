/**
 * This module process events like 'clicknode', 'clickedge', 'mouseenternode', 'mouseenteredge', 'mouseleavenode', 'mouseleaveedge'
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
    var i,
    eventName = event.getName(),
    e = event.getData().element;

    if(eventName === 'clicknode' ||
        eventName === 'clickedge' ||
        eventName === 'mouseenternode' ||
        eventName === 'mouseenteredge'){
      var graphId = event.getData().graphId;

      if(typeof(this.initialDecoration[graphId]) === 'undefined'){
        this.initDecorations(graphId);
        this.selectedDecoration[graphId] = this.initialDecoration[graphId];
      }
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
        console.log(nodesToSelect);
        nodesToSelect = nodesToSelect.concat(model.getNeighbourIds([e.id]));
        edgesToSelect = model.getNeighbourEdgeIds(e.id);
      }

      if(eventName === 'clickedge' || eventName === 'mouseenteredge') edgesToSelect = [e.id];

      // now highlight them depending on event type
      if(eventName === 'mouseenternode') this.selectedDecoration[graphId] = this.lowerOpacity(this.selectedDecoration[graphId], nodesToSelect, edgesToSelect, true);
      if(eventName === 'clicknode') this.selectedDecoration[graphId] = this.enlargeNodes(this.initialDecoration[graphId], nodesToSelect);
      if(eventName === 'clickedge') this.selectedDecoration[graphId] = this.enlargeEdges(this.initialDecoration[graphId], edgesToSelect);
      var graphViewSettings = {
        graphId: graphId,
        decoration: this.selectedDecoration[graphId]
      };
      this.publisher.publish("draw_graph_view", graphViewSettings);

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

      this.publisher.publish("draw_graph_view", graphViewSettings);

    }
    // if  node type, reliability or importance changed
    else if(
        eventName == 'graph_element_content_changed' &&
        event.getData()['type'] == 'updateNodeAttribute' &&
        ['type', 'reliability', 'importance'].indexOf(event.getData()['nodeAttribute']['name']) != -1
        ){
      graphId = event.getData()['graphId'];
      this.initDecorations(graphId);

      var node = this.publisher.getInstant('get_node_by_nodeContentId', {graphId: graphId, nodeContentId: event.getData()['nodeContentId']});
      var nodeId = node.id;
      this.selectedDecoration[graphId] = this.enlargeNodes(this.initialDecoration[graphId], [nodeId]);
      graphViewSettings = {
        graphId: graphId,
        decoration: this.selectedDecoration[graphId]
      };
      this.publisher.publish("draw_graph_view", graphViewSettings);

    }else if(eventName == 'graph_model_changed'){

      var graphModel = event.getData().graphModel;
      var graphId = graphModel.getGraphId();
      delete this.initialDecoration[graphId];

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
    this.publisher.publish("hide_graph_element_editor",{});
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
    var newOpacity, id, decoration = YOVALUE.clone(d);

    for(id in d.nodes){
      id = parseInt(id);
      if(do_reverse) newOpacity = nodeIds.indexOf(id) == -1 ? this.lowOpacityValue : d.nodes[id].opacity;
      else newOpacity = nodeIds.indexOf(id) == -1 ? d.nodes[id].opacity : this.lowOpacityValue;
      decoration.nodes[id].opacity = newOpacity;
      decoration.nodeLabels[id].opacity = newOpacity;
    }

    for(id in d.edges){
      id = parseInt(id);
      if(do_reverse) newOpacity = edgeIds.indexOf(id) == -1 ? this.lowOpacityValue : d.edges[id].opacity;
      else newOpacity = edgeIds.indexOf(id) == -1 ? d.edges[id].opacity : this.lowOpacityValue;
      decoration.edges[id].opacity = newOpacity;
    }

    return decoration;
  },

  restoreOpacity: function(graphId){
    var id;
    for(id in  this.selectedDecoration[graphId].nodes){
      this.selectedDecoration[graphId].nodes[id].opacity = this.initialDecoration[graphId].nodes[id].opacity;
      this.selectedDecoration[graphId].nodeLabels[id].opacity = this.initialDecoration[graphId].nodes[id].opacity;
    }

    for(id in this.selectedDecoration[graphId].edges){
      this.selectedDecoration[graphId].edges[id].opacity = this.initialDecoration[graphId].edges[id].opacity;
    }
  },

  initDecorations: function(graphId){
    // copy node, edge, label decoration
    this.initialDecoration[graphId] = this.publisher.getInstant('get_graph_view_decoration', {graphId: graphId});
  }
};