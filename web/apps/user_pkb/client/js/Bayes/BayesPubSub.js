YOVALUE.BayesPubSub = function(publisher, bayesCalculator){
  this.publisher = publisher;
  // Engine that calculates bayes probabilities
  this.bayesCalculator = bayesCalculator;
};

YOVALUE.BayesPubSub.prototype = {
  eventListener: function(event){
    var eventName = event.getName(),
        graphId = event.getData()['graphId'];
    var that = this;

    switch (eventName){
      case "graph_element_content_changed":
          if(event.getData()['type'] == 'updateNodeAttribute' && event.getData().nodeAttribute.name == 'p'){
            console.log('11111111111111111');
            this.bayesCalculator.calculateNodeAlternativeProbabilities(event.getData().graphId, function(d){
              console.log('BayesPubSub got response',d);
              event.setResponse(d);
            });
          }
        break;
    }
  }
};