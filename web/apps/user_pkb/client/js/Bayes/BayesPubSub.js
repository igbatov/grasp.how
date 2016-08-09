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
      case "calculate_node_alternative_probabilities":
        this.bayesCalculator.calculateNodeAlternativeProbabilities(event.getData().graph, event.getData().probabilities, function(d){
          event.setResponse(d);
        });
        break;
    }
  }
};