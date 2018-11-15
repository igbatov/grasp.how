/**
 * It sends request on server and return calculated probabilities
 * @constructor
 */
GRASP.BayesCalculatorServer = function(publisher){
  this.publisher = publisher;
};

GRASP.BayesCalculatorServer.prototype = {
  /**
   * @param graphId
   * @param callback - function that will be called when result is calculated
   */
  calculateNodeAlternativeProbabilities: function (graphId,callback){
    var that = this;
    this.publisher.publish(['get_user_settings', {settings:[GRASP.UserSettings.FIELD_BAYES_ENGINE]}])
    .then(
      function (settings) {
          that.publisher.publish(
              ['query_bayes_engine', {graphId:graphId}]
          ).then(function(d){
          callback(d);
        });
      }
    )
  }
};