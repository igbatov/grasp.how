/**
 * It sends request on server and return calculated probabilities
 * @param type - package that is used on server, now only "gRain" (= gRain for R)
 * @constructor
 */
YOVALUE.BayesCalculatorGRain = function(type, publisher){
  this.publisher = publisher;
  if(typeof(type) == 'undefined') this.type="gRain";
  else this.type=type;
};

YOVALUE.BayesCalculatorGRain.prototype = {
  /**
   * @param graph - structure of network in a form {
   *   nodes:{'e1':['1','2'], 'e2':['1','2'], 'h1':['1','2']}, // every node contains array of its alternatives
   *   edges:[['h1','e1'],['e2','h1']]
   * };
   * @param probabilities - soft evidences and node probabilities in a form
   * {
   *  e1: {
   *    soft:{1:1, 2:0}, // soft evidence for e1 and ^e1
   *    '{"h1":"1"}':{1:0.01, 2:0.99}, // sum must be equal to 1
   *    '{"h1":"2"}':{1:0.99, 2:0.01}  // sum must be equal to 1
   *  },
   *  e2: {
   *    soft:{1:1, 2:0} // soft evidence for e2 and ^e2
   *  },
   *  h1: {
   *    // prior probability of proposition alternative is 1/<number of alternatives>
   *    '{"e2":"1"}':{1:0.9999, 2:0.0001}, // sum must be equal to 1
   *    '{"e2":"2"}':{1:0.99, 2:0.01}  // sum must be equal to 1
   *   }
   * }
   * GRAPH
   *   e2 --> h1 --> e1
   * Interpretation
   * h1: 1 - I not have HIV, 2 - I have HIV
   * e1: 1 - HIV test is +, 2 - HIV test is -
   * e2: 1 - only 1 of 10000 has HIV, 2 - 1 is not true
   * @param callback - function that will be called when result is calculated
   */
  calculateNodeAlternativeProbabilities: function (graph, probabilities, callback){
    this.publisher.publish(['query_grain', {graph:graph, probabilities:probabilities}]).then(function(d){
      callback(d);
    });
  }
};