YOVALUE.SVGDrawerFactory = function(){
};

YOVALUE.SVGDrawerFactory.prototype = {
  create: function(stageContainerId, stageContainerWidth, stageContainerHeight){
    return new YOVALUE.SVGDrawer(stageContainerId, stageContainerWidth, stageContainerHeight);
  }
};