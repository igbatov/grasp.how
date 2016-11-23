/**
 * Interface that GraphView expects from object created by graphViewNodeLabelFactory
 * @param args
 * @constructor
 */
GRASP.iGraphViewNodeLabel = {
  getDrawerShape: function(){},
  getLabelId: function(){},
  getGraphId: function(){},
  getElementType: function(){},
  getElementId: function(){},
  setXY: function(){},
  getXY: function(){},
  setText: function(v){},
  getText: function(){},
  setAngle: function(){},
  getAngle: function(){},
  setSize: function(){},
  getSize: function(){},
  setOpacity: function(){},
  getOpacity: function(){}
}