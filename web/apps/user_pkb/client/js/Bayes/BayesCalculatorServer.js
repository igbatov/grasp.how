/**
 * It sends request on server and return calculated probabilities
 * @param type - package that is used on server, now only "gRain" (= gRain for R)
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
              ['query_bayes_engine', {graphId:graphId, type:settings[GRASP.UserSettings.FIELD_BAYES_ENGINE]}]
          ).then(function(d){
          callback(d);
        });
      }
    )
  }
};