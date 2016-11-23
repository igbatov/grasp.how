GRASP.CanvasDrawerFactory = function(kinetic, jQuery){
  this.kinetic = kinetic;
  this.jQuery = jQuery;
};

GRASP.CanvasDrawerFactory.prototype = {
  create: function(stageContainerId, stageContainerWidth, stageContainerHeight){
    return new GRASP.CanvasDrawer(this.kinetic, stageContainerId, stageContainerWidth, stageContainerHeight, this.jQuery);
  }
};