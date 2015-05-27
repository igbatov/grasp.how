YOVALUE.GraphModelTreeFactory = function(){

}

YOVALUE.GraphModelTreeFactory.prototype = {
  create: function(graphId){
    return new YOVALUE.GraphModelTree(new YOVALUE.GraphModel(graphId));
  }
}