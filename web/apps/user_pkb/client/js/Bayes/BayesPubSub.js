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
            this.bayesCalculator.calculateNodeAlternativeProbabilities(graphId, function(d){
              console.log('BayesPubSub got response',YOVALUE.clone(d));
              if(d.result == 'error') return;
              // normalize probabilities to be in [1,100] interval
              for(var i in d.data){
                var node = d.data[i];
                for(var j in node){
                  d.data[i][j] = Math.round(100*node[j]);
                }
              }
              that.publisher.publish([
                'request_for_graph_element_content_change',
                {graphId:graphId, type:'updateNodesReliabilities', data: d.data}
              ]);
            });
          }
        break;
    }
  }
};