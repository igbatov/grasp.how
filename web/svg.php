<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <script src="../lib/client/jquery.js"></script>
</head>
<body>

<script>

  $( document ).ready(function() {
    var drawer = new YOVALUE.SVGDrawer('container', 500, 500);
    drawer.addLayer('layerOne');
    var shape = new YOVALUE.SVGDrawer.Circle({x:100, y:100, radius:50, color:'red'});
    drawer.addShape('layerOne', shape);
  });


  YOVALUE = {};

  YOVALUE.getUniqId = function(){
    return Math.floor((Math.random() * 1000) + 1);
  };
/*----------------------------------------------------------*/
  /**
   * Interface for CanvasDrawer and SVGDrawer
   * @type {Object}
   */
  YOVALUE.SVGDrawer = function(stageContainerId, stageContainerWidth, stageContainerHeight){
    this.id = YOVALUE.getUniqId();
    this.stageContainerId = stageContainerId;
    this.svgns = "http://www.w3.org/2000/svg";
    var svgroot = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgroot.setAttribute("id", this.id);
    svgroot.setAttribute("width", stageContainerWidth);
    svgroot.setAttribute("height", stageContainerHeight);
    document.getElementById(stageContainerId).appendChild(svgroot);
  };

  YOVALUE.SVGDrawer.prototype = {
    getId: function(){
      return this.id;
    },

    /**
     * Adds layer
     * All shapes lie in a layer
     * Union of all layers is a stage
     * @param layer_id
     */
    addLayer: function(layer_id){
      var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttributeNS(null, "id", layer_id);
      document.getElementById(this.id).appendChild(g);
    },
    removeLayer: function(layer_id){},
    drawLayer: function(layer_id){},



    /**
     * Hide layer
     * @param layer_id
     */
    hideLayer: function(layer_id){},

    /**
     * Show layer
     * @param layer_id
     */
    showLayer: function(layer_id){},

    /**
     * Adds shape to the layer
     * @param layer_id
     * @param shape
     */
    addShape: function(layer_id, shape){
      document.getElementById(layer_id).appendChild(shape.getShape());
    },

    /**
     * Bind callback to shape event
     * @param eventType - one of this names ['click', 'dblclick', 'mouseenter', 'mouseleave', 'dragstart', 'dragend']
     * @param shape
     * @param callback
     * @return {Number} - bindId which can be used later in unbindShape
     */
    bindShape: function(eventType, shape, callback){},
    unbindShape: function(bindId){},
    muteShape: function(shapeId, mute){},

    /**
     * Bind 'mousemove' to stage
     * @param eventType
     * @param callback
     * @param area - {centerX:x, centerY:y, width:w, height:h} is area of stage for mousemove event.
     * Example: {centerX:10, centerY:10, width:5, height:5} means a rectangle with center
     * positioned 10 pixels to the right and 10 to bottom from left top corner of stage.
     * @return callbackId - id of callback that can be used later in unbindStage to unbind this callback
     */
    bindStage: function(eventType, callback, area){},
    unbindStage: function(bindId){},
    muteStage: function(bindId, mute){},

    /**
     * Get all shapes that have (x,y) point
     * @param x
     * @param y
     * @return {*}
     */
    getIntersections: function(x,y){}
  };

  /**
   * Rectangle
   * @constructor
   */
  YOVALUE.SVGDrawer.Rect = {
    getId: function(){},

    setX: function(v){},
    getX: function(){},
    setY: function(v){},
    getY: function(){},

    setGraggable: function(v){},
    getGraggable: function(){},

    setWidth: function(v){},
    getWidth: function(){},
    setHeight: function(v){},
    getHeight: function(){},

    setOpacity: function(v){},
    getOpacity: function(){},

    setFill: function(v){},
    getFill: function(){},

    setStroke: function(v){},
    getStroke: function(){},

    setStrokeWidth: function(v){},
    getStrokeWidth: function(){},

    remove: function(){}
  };

  /**
   * Path
   * @param args
   * @constructor
   */
  YOVALUE.SVGDrawer.Path = {
    getId: function(){},

    setData: function(v){},
    getData: function(){},

    setGraggable: function(v){},
    getGraggable: function(){},

    setOpacity: function(v){},
    getOpacity: function(){},

    setStroke: function(v){},
    getStroke: function(){},

    setStrokeWidth: function(v){},
    getStrokeWidth: function(){}
  };

  /**
   * Circle
   * @param args
   * @constructor
   */
  YOVALUE.SVGDrawer.Circle = function(args){
    this.id = YOVALUE.getUniqId();
    this.x = args.x;
    this.y = args.y;
    this.radius = args.radius;
    this.color = args.color;

    this.shape = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    this.shape.setAttributeNS(null, "id", this.id);
    this.shape.setAttributeNS(null, "cx", args.x);
    this.shape.setAttributeNS(null, "cy", args.y);
    this.shape.setAttributeNS(null, "r",  args.radius);
    this.shape.setAttributeNS(null, "fill", args.color);
    this.shape.setAttributeNS(null, "transform", "matrix(1 0 0 1 0 0)");
    this.shape.addEventListener("click",this,false);
  };

  YOVALUE.SVGDrawer.Circle.prototype = {
    getId: function(){
      return this.id;
    },
    getShape: function(){
      return this.shape;
    },

    handleEvent: function(evt){
      console.log(evt);
    },

    setX: function(v){
      this.shape.setAttributeNS(null, "cx", v);
    },
    getX: function(){},
    setY: function(v){},
    getY: function(){},

    setRadius: function(v){},
    getRadius: function(){},

    setGraggable: function(v){},
    getGraggable: function(){},

    setOpacity: function(v){},
    getOpacity: function(){},

    setStroke: function(v){},
    getStroke: function(){},

    setStrokeWidth: function(v){},
    getStrokeWidth: function(){}
  };

  /**
   * Text
   * @param args
   * @constructor
   */
  YOVALUE.SVGDrawer.Text = {
    getId: function(){},

    setX: function(v){},
    getX: function(){},
    setY: function(v){},
    getY: function(){},

    setText: function(v){},
    getText: function(){},

    setFontSize: function(v){},
    getFontSize: function(){},

    setFontFamily: function(v){},
    getFontFamily: function(){},

    setGraggable: function(v){},
    getGraggable: function(){},

    setOpacity: function(v){},
    getOpacity: function(){},

    setFill: function(v){},
    getFill: function(){}
  };
/*--------------------------------------*/

</script>

<div id="container"></div>

</body>
</html>