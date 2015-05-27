YOVALUE.GraphViewFactory = function(nodeFactory, edgeFactory, labelFactory){
  this.nodeFactory = nodeFactory;
  this.edgeFactory = edgeFactory;
  this.labelFactory = labelFactory;
};

YOVALUE.GraphViewFactory.prototype = {
  create: function(graphId, canvasDrawer){
    return new YOVALUE.GraphView(graphId, canvasDrawer, this.nodeFactory, this.edgeFactory, this.labelFactory);
  }
};