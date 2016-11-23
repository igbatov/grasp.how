GRASP.GraphViewFactory = function(){

};

GRASP.GraphViewFactory.prototype = {
  create: function(graphId, drawer){
    return new GRASP.GraphView(graphId, drawer);
  }
};