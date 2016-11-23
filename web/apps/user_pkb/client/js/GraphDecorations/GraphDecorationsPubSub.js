GRASP.GraphDecorationsPubSub = function(graphDecoration){
  this.graphDecoration = graphDecoration;
};

GRASP.GraphDecorationsPubSub.prototype = {
  eventListener: function(event){
    var eventName = event.getName(),
      graphModel = event.getData()['graphModel'],
      graphNodeAttributes = event.getData()['graphNodeAttributes'],
      graphEdgeAttributes = event.getData()['graphEdgeAttributes'],
      scale = event.getData()['scale'],
      skin = event.getData()['skin'];

    switch (eventName){
      case "get_graph_decoration":
        var d = this.graphDecoration.getDecoration(graphModel, graphNodeAttributes, graphEdgeAttributes, scale, skin);
        event.setResponse(d);
        break;
    }
  }
};