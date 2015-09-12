YOVALUE.GraphModelFactory = function(){

}

YOVALUE.GraphModelFactory.prototype = {
  create: function(graphId){
    return new YOVALUE.GraphModel(graphId);
  }
}