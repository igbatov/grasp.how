GRASP.BayesPubSub = function(publisher, bayesCalculator){
  this.publisher = publisher;
  // Engine that calculates bayes probabilities
  this.bayesCalculator = bayesCalculator;
};

GRASP.BayesPubSub.prototype = {
  eventListener: function(event){
    var eventName = event.getName(),
        graphId = event.getData()['graphId'];
    var that = this;

    switch (eventName){
      case "calculate_bayes_probabilities":
        this.bayesCalculator.calculateNodeAlternativeProbabilities(graphId, function(d){
          console.log('BayesPubSub got response',GRASP.clone(d));
          if(d.result == 'error'){
            // collect all nodes that have errors
            var stickers = {};
            for(var errorType in d.data){
              for(var i in d.data[errorType]) stickers[d.data[errorType][i]] = ['bayes_error'];
            }
            console.log(stickers);
            that.publisher.publish([
              'request_for_graph_element_content_change',
              {graphId:graphId, type:'node_stickers_add_request', stickers: stickers}
            ]);

          } else {
            // normalize probabilities to be in [0,100] interval
            // TODO: this is ugly hack because fact reliability is from 0 to 100
            // We need to store hypothesis probability as well as fact reliability in uniform format - from 0 to 1
            for(var i in d.data){
              var node = d.data[i];
              for(var j in node){
                d.data[i][j] = 100*node[j];
              }
            }

            // remove bayes_error stickers from all nodes
            var model = that.publisher.getInstant('get_graph_models', [graphId])[graphId];
            var stickers = {};
            for(var i in model.getNodes()){
              stickers[model.getNodes()[i].nodeContentId] = ['bayes_error'];
            }
            that.publisher.publish([
              'request_for_graph_element_content_change',
              {graphId:graphId, type:'node_stickers_remove_request', stickers:stickers}
            ]);
            that.publisher.publish([
              'request_for_graph_element_content_change',
              {graphId:graphId, type:'updateNodesReliabilities', data: d.data}
            ]);
          }

        });
        break;
    }
  }
};