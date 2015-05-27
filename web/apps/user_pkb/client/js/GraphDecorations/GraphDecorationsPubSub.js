YOVALUE.GraphDecorationsPubSub = function(subscriber, graphDecoration){
  this.subscriber = subscriber;
  this.graphDecoration = graphDecoration;

  this.subscriber.subscribe(this,[
    'get_graph_decoration'
  ]);
};

YOVALUE.GraphDecorationsPubSub.prototype = {
  eventListener: function(event){
    var eventName = event.getName(),
      graphModel = event.getData()['graphModel'],
      graphNodeAttributes = event.getData()['graphNodeAttributes'],
      graphEdgeAttributes = event.getData()['graphEdgeAttributes'],
      scale = event.getData()['scale'];

    switch (eventName){
      case "get_graph_decoration":
        var d = this.graphDecoration.getDecoration(graphModel, graphNodeAttributes, graphEdgeAttributes, scale);
        event.setResponse(d);
        break;
    }
  }
};