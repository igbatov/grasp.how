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
          if(event.getData()['type'] == 'updateNodeAlternativesP'){
            this.bayesCalculator.calculateNodeAlternativeProbabilities(event.getData().graphId, function(d){
              console.log('BayesPubSub got response',d);
              that.publisher.publish(['request_for_graph_element_content_change',{type:'updateNodeReliabilities', data:d}]);
            });
          }
        break;
    }
  }
};