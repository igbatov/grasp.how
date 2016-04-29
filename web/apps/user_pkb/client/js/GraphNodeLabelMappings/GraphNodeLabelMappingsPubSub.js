YOVALUE.GraphNodeLabelMappingsPubSub = function(){
  this.nodeLabelMappers = {};
};

YOVALUE.GraphNodeLabelMappingsPubSub.prototype = {
  eventListener: function(event){
    var eventName = event.getName(),
      graphId = event.getData()['graphId'],
      layout = event.getData()['layout'],
      nodeMapping = event.getData()['nodeMapping'],
      nodeLabels = event.getData()['nodeLabels'],
      nodeLabelAreaList = event.getData()['nodeLabelAreaList'];

    //create layout node mapper if it is not already exists
    if(typeof(this.nodeLabelMappers[layout.layoutName]) === 'undefined'){
      this.nodeLabelMappers[layout.layoutName] = new layout.layout.nodeLabel.constructor(layout.layout.nodeLabel.attr);
    }

    switch (eventName){
      case "get_node_label_mapping":
        var mapping = this.nodeLabelMappers[layout.layoutName].getMapping(nodeMapping, nodeLabelAreaList, nodeLabels);
        event.setResponse(mapping);
        break;
    }
  }
};