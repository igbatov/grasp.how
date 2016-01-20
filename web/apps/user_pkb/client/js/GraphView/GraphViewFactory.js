YOVALUE.GraphViewFactory = function(nodeFactory, edgeFactory, labelFactory){
  this.nodeFactory = nodeFactory;
  this.edgeFactory = edgeFactory;
  this.labelFactory = labelFactory;
};

YOVALUE.GraphViewFactory.prototype = {
  create: function(graphId, drawer){
    return new YOVALUE.GraphView(graphId, drawer, this.nodeFactory, this.edgeFactory, this.labelFactory);
  }
};