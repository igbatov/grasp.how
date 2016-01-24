YOVALUE.GraphViewFactory = function(){

};

YOVALUE.GraphViewFactory.prototype = {
  create: function(graphId, drawer){
    return new YOVALUE.GraphView(graphId, drawer);
  }
};