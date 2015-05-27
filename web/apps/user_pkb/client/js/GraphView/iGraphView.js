/**
 * Interface of IGraphView
 * @type {Object}
 */
YOVALUE.iGraphView = {
  remove: function(){},

  setNodeLayout: function(){},
  setNodeLabelLayout: function(){},
  setModel: function(){},
  setDecoration: function(){},
  setGraphArea: function(){},

  drawGraph: function(){},

  show: function(){},
  hide: function(){},

  bind: function(eventType, callback){},
  unbind: function(eventType){},

  findModelElementByShapeId: function(shapeId){}
}