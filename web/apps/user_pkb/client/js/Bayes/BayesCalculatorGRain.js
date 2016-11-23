/**
 * It sends request on server and return calculated probabilities
 * @param type - package that is used on server, now only "gRain" (= gRain for R)
 * @constructor
 */
GRASP.BayesCalculatorGRain = function(publisher){
  this.publisher = publisher;
};

GRASP.BayesCalculatorGRain.prototype = {
  /**
   * @param graphId
   * @param callback - function that will be called when result is calculated
   */
  calculateNodeAlternativeProbabilities: function (graphId,callback){
    var that = this;
    this.publisher.publish(['query_grain', {graphId:graphId}]).then(function(d){
      callback(d);
    });
  }
};