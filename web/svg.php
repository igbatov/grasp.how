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
    var shape1 = new YOVALUE.SVGDrawer.Circle({x:100, y:100, radius:50, color:'red'});
    drawer.addShape('layerOne', shape1);
    var shape2 = new YOVALUE.SVGDrawer.Circle({x:120, y:100, radius:50, color:'blue'});
    drawer.addShape('layerOne', shape2);
    shape1.setDraggable(true);
    shape2.setDraggable(false);
    shape2.setDraggable(true);
    console.log(drawer.getIntersections(125,100));
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
    this.svgroot = document.createElementNS(this.svgns, "svg");
    this.svgroot.setAttribute("id", this.id);
    this.svgroot.setAttribute("width", stageContainerWidth);
    this.svgroot.setAttribute("height", stageContainerHeight);
    this.shapes = {}; // all shapes added by addShape()
    document.getElementById(stageContainerId).appendChild(this.svgroot);
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
      this.svgroot.appendChild(g);
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
      this.shapes[shape.getId()] = shape;
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
    getIntersections: function(x,y){
      if(this.svgroot.getIntersectionList) {
        var hitRect = this.svgroot.createSVGRect();
        hitRect.height = 1;
        hitRect.width = 1;
        hitRect.y = y;
        hitRect.x = x;
        return this.svgroot.getIntersectionList(hitRect, null);
      } else {
        // hack for firefox (ver 43.0.4 still does not support getIntersectionList)
        var i, id, shapePointerEvents = {}, shapesUnderPoint = [];
        // save attribute pointer-events for all shapes
        for(id in this.shapes) shapePointerEvents[id] = this.shapes[id].getShape().getAttribute('pointer-events');
        // test every shape for (x, y) overlap
        for(id in this.shapes){
          for(i in this.shapes) this.shapes[i].getShape().setAttribute('pointer-events', 'none');
          this.shapes[id].getShape().setAttributeNS(null, 'pointer-events', 'visiblePainted');
          shapesUnderPoint.push(document.elementFromPoint(x, y));
        }
        // restore original pointer-events attribute
        for(id in this.shapes) shapePointerEvents[id] = this.shapes[id].getShape().setAttribute('pointer-events', shapePointerEvents[id]);
        return shapesUnderPoint;
      }
    }
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

    setDraggable: function(v){},
    getDraggable: function(){},

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

    setDraggable: function(v){},
    getDraggable: function(){},

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
    var i;
    this.id = YOVALUE.getUniqId();
    this.x = args.x;
    this.y = args.y;
    this.matrix = [1, 0, 0, 1, 0, 0];
    this.radius = args.radius;
    this.color = args.color;
    this.draggable = args.draggable;
    this.mousedown = false;

    this.shape = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    this.shape.setAttributeNS(null, "id", this.id);
    this.shape.setAttributeNS(null, "cx", args.x);
    this.shape.setAttributeNS(null, "cy", args.y);
    this.shape.setAttributeNS(null, "r",  args.radius);
    this.shape.setAttributeNS(null, "fill", args.color);
    this.shape.setAttributeNS(null, "transform", "matrix("+ this.matrix.join(' ') +")");

    var mouseEvents = ["mouseover", "mouseout", "mousedown", "mouseup", "click", "dblclick"];
    for(i in mouseEvents){
      this.shape.addEventListener(mouseEvents[i],this,false);
    }
    document.addEventListener('mousemove',this,false);
  };

  YOVALUE.SVGDrawer.Circle.prototype = {
    getId: function(){
      return this.id;
    },
    getShape: function(){
      return this.shape;
    },

    handleEvent: function(evt){
      evt.preventDefault(); // fix for firefox image dragging do not interfere with our custom dragging

      if(evt.type == "mousedown"){
        console.log(evt);
        this.mousedown = true;
      }
      if(evt.type == "mouseup"){
        console.log(evt);
        this.mousedown = false;
      }
      if(evt.type == "mousemove"){
        if(this.mousedown && this.draggable){
          // move shape to front
          this.getShape().parentElement.appendChild(this.getShape());
          // update shapes (x, y)
          this.matrix[4] += evt.clientX - this.x;
          this.matrix[5] += evt.clientY - this.y;
          this.getShape().setAttributeNS(null, "transform", "matrix(" + this.matrix.join(' ') + ")");
          this.x = evt.clientX;
          this.y = evt.clientY;
        }
      }
    },

    setX: function(v){
      this.shape.setAttributeNS(null, "cx", v);
    },
    getX: function(){},
    setY: function(v){},
    getY: function(){},

    setRadius: function(v){},
    getRadius: function(){},

    /**
     * Make shape draggable or not
     * @param v boolean
     */
    setDraggable: function(v){
      this.draggable = v;
    },
    getDraggable: function(){
      return this.draggable;
    },

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

    setDraggable: function(v){},
    getDraggable: function(){},

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