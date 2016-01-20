YOVALUE.CanvasDrawerFactory = function(kinetic, jQuery){
  this.kinetic = kinetic;
  this.jQuery = jQuery;
};

YOVALUE.CanvasDrawerFactory.prototype = {
  create: function(stageContainerId, stageContainerWidth, stageContainerHeight){
    return new YOVALUE.CanvasDrawer(this.kinetic, stageContainerId, stageContainerWidth, stageContainerHeight, this.jQuery);
  }
};