YOVALUE.GraphNodeMappingsPubSub = function(){
  this.nodeMappers = {};
};

YOVALUE.GraphNodeMappingsPubSub.prototype = {
  eventListener: function(event){
    var eventName = event.getName(),
      graphId = event.getData()['graphId'],
      nodes = event.getData()['model'].nodes,
      edges = event.getData()['model'].edges,
      hint = event.getData()['hint'],
      layout = event.getData()['layout'],
      nodeLabelAreaList = event.getData()['nodeLabelAreaList'],
      area = event.getData()['area'];

    //create layout node mapper if it is not already exists
    if(typeof(this.nodeMappers[layout.layoutName]) === 'undefined'){
      this.nodeMappers[layout.layoutName] = new layout.layout.node.constructor(layout.layout.node.attr);
    }

    switch (eventName){
      case "get_node_mapping":
        var mapping = this.nodeMappers[layout.layoutName].getMapping(nodes, edges, hint, nodeLabelAreaList, area);
        event.setResponse(mapping);
        break;
    }
  }
};