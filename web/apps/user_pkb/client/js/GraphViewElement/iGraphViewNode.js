/**
 * Interface that GraphView expects from object created by graphViewNodeFactory
 * @param args
 * @constructor
 */
GRASP.iGraphViewNode = {
  getDrawerShape: function(){},
  getElementType: function(){},
  getElementId: function(){},
  setNodeType: function(v){},
  getNodeType: function(){},
  getGraphId: function(){},
  clone: function(){},
  setXY: function(v){},
  getXY: function(){},
  setColor: function(v){},
  getColor: function(){},
  setSize: function(v){},
  getSize: function(){},
  setStickers: function(v){},
  getStickers: function(){},
  setOpacity: function(v){},
  getOpacity: function(){}
};