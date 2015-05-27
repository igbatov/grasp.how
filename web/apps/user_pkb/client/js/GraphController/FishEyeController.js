YOVALUE.FishEyeController = function(publisher){
  this.publisher = publisher;
  this.initialMapping = {};
  this.initialLabelMapping = {};
  this.initialDecoration = {};
};

YOVALUE.FishEyeController.prototype = {
  execute: function(event, selectedElement){
   // return true;
    var eventName = event.getName();
    var that = this, m, i;

    if(eventName === 'graph_position_changed' ||
      eventName === 'graph_model_changed' ||
      eventName === 'clicknode' ||
      eventName === 'clickedge' ||
      eventName === 'mouseenternode' ||
      eventName === 'mouseenteredge'  ||
      eventName === 'clickbackground' ||
      eventName === 'mouseleavenode' ||
      eventName === 'mouseleaveedge'){
      this._initMapping(event.getData()['graphId']);

    }else if(eventName == 'graph_element_content_changed'){
      if(event.getData()['type'] == 'updateNodeText') return true;
      this._initMapping(event.getData()['graphId']);

    }else if(eventName === 'mousemove'){
      var graphId = event.getData()['graphId'];
      if(typeof(this.initialMapping[graphId]) === 'undefined'){
        this._initMapping(graphId);
      }

      var skin = that.publisher.publishResponseEvent(that.publisher.createEvent("get_selected_skin", graphId));
      if(typeof(skin) == 'undefined') return;
      var maxLabelSize = skin.skin.nodeLabel.attr.maxSize;

      m = this.initialMapping[graphId];
      var nodeSize = this.initialDecoration[graphId].nodes[YOVALUE.getObjectKeys(m.mapping)[0]].size;
      var fishEyeLayoutInput = YOVALUE.clone(m.mapping);
      for(i in fishEyeLayoutInput){
        fishEyeLayoutInput[i].size = this.initialDecoration[graphId].nodeLabels[i].size;
      }

      var e = this.publisher.createEvent('get_fish_eyed_layout', {"node_layout": fishEyeLayoutInput, "max_node_size":maxLabelSize, "radius":m.area.width/(20 - nodeSize*5/4), "center":{"x":event.getData().x, "y":event.getData().y}});
      var l = this.publisher.publishResponseEvent(e);

      var d = YOVALUE.clone(this.initialDecoration[graphId]);
      for(i in d.nodes){
        if(d.nodeLabels[i].size != l[i].size) d.nodeLabels[i].size = l[i].size;
      }

      var graphViewSettings = {
        graphId: graphId,
        decoration: d
      };

      this.publisher.publish("draw_graph_view", graphViewSettings);
    }
  },

  _initMapping: function(graphId){
    var m = this.publisher.publishResponseEvent(this.publisher.createEvent('get_graph_view_node_mapping', {graphId: graphId}));
    var area = YOVALUE.clone(m.area);
    var mapping = YOVALUE.clone(m.mapping);
    this.initialMapping[graphId] = {
      area:  area,
      mapping:  mapping
    };

    var lm = this.publisher.publishResponseEvent(this.publisher.createEvent('get_graph_view_node_label_mapping', {graphId: graphId}));
    var lmArea = YOVALUE.clone(lm.area);
    var lmMapping = YOVALUE.clone(lm.mapping);
    this.initialLabelMapping[graphId] = {
      area: lmArea,
      mapping: lmMapping
    };

    var d = this.publisher.publishResponseEvent(this.publisher.createEvent('get_graph_view_decoration', {graphId: graphId}));
    this.initialDecoration[graphId] = YOVALUE.clone(d);
  }
};