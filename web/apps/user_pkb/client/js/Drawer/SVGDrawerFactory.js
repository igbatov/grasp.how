GRASP.SVGDrawerFactory = function(){
};

GRASP.SVGDrawerFactory.prototype = {
  create: function(stageContainerId, stageContainerWidth, stageContainerHeight){
    return new GRASP.SVGDrawer(stageContainerId, stageContainerWidth, stageContainerHeight);
  }
};