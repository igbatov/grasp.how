YOVALUE.BayesPubSub = function(publisher, bayesCalculator){
  this.publisher = publisher;
  // Engine that calculates bayes probabilities
  this.bayesCalculator = bayesCalculator;
  /**
   *  List of graphs in a form
   *  this.graphs = {
   *    1:
   *      {
            // every node contains array of its alternatives
            nodes:{'e1':['1','2'], 'h1':['1','2']},
            edges:[['h1','e1']]
          },
        2:
          ...
      }
    */

  this.bayesGraphs = {};
  /**
   * List of graphs structure and probabilities in a form
   * this.probabilities = {
   *  1:
   *    graph:
   *    {
          // every node contains array of its alternatives
          nodes:{'e1':['1','2'], 'h1':['1','2']},
          edges:[['h1','e1']]
   *    },
   *    probabilities:
   *    {
          e1: {
            soft:{1:0.9, 2:0.1}, // soft evidence for e1 and ^e1
            '{"h1":"1"}':{1:0.9, 2:0.1}, // sum must be equal to 1
            '{"h1":"2"}':{1:0.5, 2:0.5}  // sum must be equal to 1
          },
          h1: {
            soft:{1:0.5, 2:0.5} // soft evidence == prior probability
          }
   *    },
   *
   *  2:
        ...
     }
   * @type {{}}
   */
  this.probabilities = {};
};

YOVALUE.BayesPubSub.prototype = {
  eventListener: function(event){
    var eventName = event.getName(),
        graphId = event.getData()['graphId'];
    var that = this;

    switch (eventName){
      case "get_bayes_graph":
        if(typeof(this.probabilities[graphId]) == 'undefined'){
          this.updateCache(function(bayesGraph){
            event.setResponse(bayesGraph);
          });
        }else{
          event.setResponse(this.bayesGraphs[graphId]);
        }
        break;

      case "graph_model_changed":
        delete that.bayesGraphs[graphId];
        break;

      case "graph_element_content_changed":
        delete that.bayesGraphs[graphId];
        break;

        var d = this.bayesCalculator.getDecoration(graphModel, graphNodeAttributes, graphEdgeAttributes, scale, skin);
        event.setResponse(d);
        break;
    }
  },

  updateCache: function(graphId, callback){
    var that = this;
    this.publisher
        .publish(
          ['repository_get_bayes_graph', {graphId:graphId}]
        )
        .then(function(bayesGraph){
          that.bayesGraphs[graphId] = bayesGraph;
          callback(bayesGraph);
        });
  }
};