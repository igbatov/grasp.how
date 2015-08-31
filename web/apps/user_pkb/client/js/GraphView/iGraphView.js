/**
 * Interface of IGraphView
 * @type {Object}
 */
YOVALUE.iGraphView = {
  remove: function(){},

  setNodeMapping: function(){},
  setNodeLabelMapping: function(){},
  setModel: function(){},
  setDecoration: function(){},
  setSkin: function(){},
  setGraphArea: function(){},

  drawGraph: function(){},

  show: function(){},
  hide: function(){},
  remove: function(){},

  bind: function(eventType, callback){},
  unbind: function(eventType){},

  findModelElementByShapeId: function(shapeId){}
}