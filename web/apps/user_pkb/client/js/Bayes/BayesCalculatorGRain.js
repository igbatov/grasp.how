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
   * @param graphId
   * @param callback - function that will be called when result is calculated
   */
  calculateNodeAlternativeProbabilities: function (graphId,callback){
    this.publisher.publish(['query_grain', {graphId:graphId}]).then(function(d){
      callback(d);
    });
  }
};