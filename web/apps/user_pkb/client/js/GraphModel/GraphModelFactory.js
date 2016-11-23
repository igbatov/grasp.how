GRASP.GraphModelFactory = function(){

}

GRASP.GraphModelFactory.prototype = {
  create: function(graphId){
    return new GRASP.GraphModel(graphId);
  }
}