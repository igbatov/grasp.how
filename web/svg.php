<!doctype html>
<head>
  <meta http-equiv="content-type" content="text/html; charset=UTF-8">
  <script src="../lib/client/jquery.js"></script>
</head>
<body>

<script>

  $( document ).ready(function() {
    var drawer = new YOVALUE.SVGDrawer('container', 1000, 1000);
    drawer.addLayer('layerOne');
//    var shape1 = drawer.createShape('circle', {x:100, y:100, radius:50, color:'blue'});
  //  var shape1 = drawer.createShape('rectangle', {x:100, y:100, width:50, height:50, color:'blue'});
  //  drawer.addShape('layerOne', shape1);
    var shape2 = drawer.createShape('rectangle', {x:120, y:100, width:50, height:50, fill:'red'});
    drawer.addShape('layerOne', shape2);
    for(var i=0; i<=50; i++){
      var shape3 = drawer.createShape('circle', {x:10+10*i, y:10+10*i, radius:50, fill:'green', opacity:0.2});
      drawer.addShape('layerOne', shape3);
      shape3.setDraggable(true);
      var shape4 = drawer.createShape('path', {x:10+10*i, y:10+10*i, data:'M 100 350 q 150 -300 300 0', fill:'none', stroke:'blue', strokeWidth:2});
      drawer.addShape('layerOne', shape4);
      var shape5 = drawer.createShape('text', {x:10+10*i, y:10+10*i, text:'Привет всем!', fill:'black'});
      drawer.addShape('layerOne', shape5);
      shape5.setPointerEvents('none');

    }
    var p = shape5.getBBox();
    var shape6 = drawer.createShape('rectangle', {x:p.x, y:p.y, width:p.width, height:p.height, fill:'none', stroke:'blue', strokeWidth:2});
    drawer.addShape('layerOne', shape6);

 //   shape2.setDraggable(true);
   // shape2.setY(200);
    var intersections = drawer.getIntersections(120,100);
    console.log(intersections);
    //for(var i in intersections)  console.log(intersections[i]);
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
    this._createSVGDragEvent();
    this._makeShapesDraggable();
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
      shape.setXY(shape.getXY());
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
      if(this.svgroot.getIntersectionList && YOVALUE.getBrowserInfo().type != "Safari") {
        var hitRect = this.svgroot.createSVGRect();
        hitRect.height = 1;
        hitRect.width = 1;
        hitRect.y = y;
        hitRect.x = x;
        return this.svgroot.getIntersectionList(hitRect, null);
      }
      // hack for firefox (ver 43.0.4 still does not support getIntersectionList)
      // safari 5.1.7 under windows also does not seem to getIntersectionList properly
      else {
        var i, id, shapePointerEvents = {}, shapesUnderPoint = [];
        // save attribute pointer-events for all shapes
        for(id in this.shapes) shapePointerEvents[id] = this.shapes[id].getShape().getAttribute('pointer-events');
        // test every shape for (x, y) overlap
        for(id in this.shapes){
          for(i in this.shapes) this.shapes[i].getShape().setAttribute('pointer-events', 'none');
          this.shapes[id].getShape().setAttributeNS(null, 'pointer-events', 'visiblePainted');
          var el = document.elementFromPoint(x, y);
          if(!YOVALUE.isObjectInArray(shapesUnderPoint, el)) shapesUnderPoint.push(el);
        }
        // restore original pointer-events attribute
        for(id in this.shapes) shapePointerEvents[id] = this.shapes[id].getShape().setAttribute('pointer-events', shapePointerEvents[id]);
        return shapesUnderPoint;
      }
    },

    createShape: function(type, args){
      if(type == 'circle'){
        return new YOVALUE.SVGDrawer.Circle(new YOVALUE.SVGDrawer.BaseShape(args), args);
      }else if(type == 'rectangle'){
        return new YOVALUE.SVGDrawer.Rect(new YOVALUE.SVGDrawer.BaseShape(args), args);
      }else if(type == 'path'){
        return new YOVALUE.SVGDrawer.Path(new YOVALUE.SVGDrawer.BaseShape(args), args);
      }else if(type == 'text'){
        return new YOVALUE.SVGDrawer.Text(new YOVALUE.SVGDrawer.BaseShape(args), args);
      }
    },

    /**
     * Adds callback for events of type ['click', 'mouseenter', 'mouseleave', 'drag', 'drop'] on all shapes with class classname
     */
    addEventListener: function(event, callback, classname){
      var that = this;
      document.addEventListener(event, function(e){
        for(var id in that.shapes){
          var targetId;

          if(e.type == 'drag' || e.type == 'drop') targetId = e.detail.id;
          else targetId = e.target.id;

          if(
              targetId == id
                  && (typeof(classname) == 'undefined' || (typeof(classname) != 'undefined' && that.shapes[id].getClass() == classname))){
            callback(e, that.shapes[id]);
          }
        }
      });
    },

    _createSVGDragEvent: function(){
      var that = this;
      var handler = function(evt){
        var shape;
        var xOffset=Math.max(document.documentElement.scrollLeft,document.body.scrollLeft);
        var yOffset=Math.max(document.documentElement.scrollTop,document.body.scrollTop);
        var x = evt.type.substr(0, 5) == "mouse" ? evt.clientX : evt.changedTouches[0].clientX;
        var y = evt.type.substr(0, 5) == "mouse" ? evt.clientY : evt.changedTouches[0].clientY;
        x += xOffset;
        y += yOffset;

        // ignore 2 touch gestures
        if(evt.type.substr(0, 5) == 'touch' && evt.touches.length == 2) return true;

        // fix for firefox image dragging do not interfere with our custom dragging
        if(evt.type.substr(0, 5) != 'touch') evt.preventDefault();

        // if not mousemove
        if(evt.type != "mousemove" && evt.type != "touchmove"){
          for(var id in that.shapes){
            if(evt.target.id == id) shape = that.shapes[id];
            if(shape && !shape.getDraggable()) return;

            if(shape && (evt.type == "mousedown" || evt.type == "touchstart")){
              shape.mousedown = true;
            }

            if(shape && (evt.type == "mouseup" || evt.type == "touchend") && shape.mousedown == true){
              shape.mousedown = false;
              var myEvent = new CustomEvent("drop", {detail:{id: that.getId()}});
              document.dispatchEvent(myEvent);
            }
          }
        }else{
          // do not drag screen on touch device
          evt.preventDefault();
          for(var id in that.shapes){
            shape = that.shapes[id];
            if(shape.mousedown && shape.getDraggable){
              var myEvent = new CustomEvent("drag", {detail:{id: shape.getId(), x:x, y:y}});
              document.dispatchEvent(myEvent);
            }
          }
        }
      };

      document.addEventListener('mousedown', handler, false);
      document.addEventListener('touchstart', handler, false);
      document.addEventListener('mousemove', handler, false);
      document.addEventListener('touchmove', handler, false);
      document.addEventListener("mouseup", handler, false);
      document.addEventListener("touchend", handler, false);
    },


    _makeShapesDraggable: function(){
     this.addEventListener('drag', function(evt, shape){
       // move shape to front
       shape.getShape().parentNode.appendChild(shape.getShape());
       // update shapes (x, y)
       shape.setXY({x:evt.detail.x, y:evt.detail.y});
     });
    }

  };
  /**
   * Circle
   * @param args
   * @constructor
   */
  YOVALUE.SVGDrawer.BaseShape = function(args){
    this.id = YOVALUE.getUniqId();
    this.x = args.x;
    this.y = args.y;
    this.matrix = [1, 0, 0, 1, args.x, args.y];
    this.fill = args.fill;
    this.opacity = args.opacity;
    this.stroke = args.stroke;
    this.strokeWidth = args.strokeWidth;
    this.draggable = args.draggable;
    this.mousedown = false;
    this.shape = null; // should be redefined in final shape class
  };

  YOVALUE.SVGDrawer.BaseShape.prototype = {
    init: function(){
      this.setId(this.id);
      this.setFill(this.fill);
      this.setOpacity(this.opacity);
      this.setStroke(this.stroke);
      this.setStrokeWidth(this.strokeWidth);
    },

    setId: function(v){
      this.id = v;
      this.shape.setAttributeNS(null, "id", v);
    },
    getId: function(){
      return this.id;
    },

    setClass: function(v){
      this.class = v;
      this.shape.setAttributeNS(null, "class", v);
    },
    getClass: function(){
      return this.class;
    },

    getShape: function(){
      return this.shape;
    },
    setShape: function(v){
      return this.shape = v;
    },

    /**
     * Set center of shape to x, y
     */
    setXY: function(p){
      if(YOVALUE.typeof(p.x)!='number' || YOVALUE.typeof(p.y)!='number') return false;
      this.x = p.x;
      this.y = p.y;
      // circle in svg is positioned by center coordinates, rectangle by its left up corner, text by its left bottom corner
      this.matrix[4] = this.shape.nodeName == 'circle' ? p.x : p.x-this.getBBox().width/2;
      this.matrix[5] = this.shape.nodeName == 'circle' ? p.y : p.y-this.getBBox().height/2;
      if(this.shape.nodeName == 'text') this.matrix[5] += this.getBBox().height;
      if(this.shape) this.shape.setAttributeNS(null, "transform", "matrix("+ this.matrix.join(' ') +")");
      if(this.shape) this.shape.setAttributeNS(null, "transform", "matrix("+ this.matrix.join(' ') +")");
    },
    getXY: function(){
      return {x: this.x, y: this.y};
    },

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

    setOpacity: function(v){
      this.opacity = v;
      this.shape.setAttributeNS(null, "opacity", v);
    },
    getOpacity: function(){
      return this.opacity;
    },

    setFill: function(v){
      this.fill = v;
      this.shape.setAttributeNS(null, "fill", v);
    },
    getFill: function(){
      return this.fill;
    },

    setStroke: function(v){
      this.stroke = v;
      this.shape.setAttributeNS(null, "stroke", v);
    },
    getStroke: function(){
      return this.stroke;
    },

    setStrokeWidth: function(v){
      this.strokeWidth = v;
      this.shape.setAttributeNS(null, "stroke-width", v);
    },
    getStrokeWidth: function(){
      return this.strokeWidth;
    },

    setPointerEvents: function(v){
      this.pointerEvents = v;
      this.shape.setAttributeNS(null, "pointer-events", v);
    },
    getPointerEvents: function(){
      return this.pointerEvents;
    },

    getBBox: function(){
      var bbox = this.getShape().getBBox();
      return {x:YOVALUE.typeof(this.x)=='number'?this.x:(bbox.x+bbox.width/2), y:YOVALUE.typeof(this.y)=='number'?this.y:(bbox.y+bbox.height/2), width:bbox.width, height:bbox.height};
    }
  };


  /**
   * Rectangle
   * @constructor
   */
  YOVALUE.SVGDrawer.Rect = function(baseShape, args){
    YOVALUE.mixin(baseShape, this);
    this.shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    baseShape.setShape(this.shape);
    baseShape.init();
    this.setWidth(args.width);
    this.setHeight(args.height);
  };

  YOVALUE.SVGDrawer.Rect.prototype = {
    setWidth: function(v){
      this.width = v;
      this.getShape().setAttributeNS(null, "width",  v);
    },
    getWidth: function(){
      return this.width;
    },
    setHeight: function(v){
      this.height = v;
      this.getShape().setAttributeNS(null, "height",  v);
    },
    getHeight: function(){
      return this.height;
    },
    setShape: function(){
      return false;
    }
  };

  /**
   * Path
   * @param args
   * @constructor
   */
  YOVALUE.SVGDrawer.Path = function(baseShape, args){
    YOVALUE.mixin(baseShape, this);
    this.shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
    baseShape.setShape(this.shape);
    baseShape.init();
    this.setData(args.data);
  };

  YOVALUE.SVGDrawer.Path.prototype = {
    setData: function(v){
      this.data = v;
      this.getShape().setAttributeNS(null, "d",  v);
    },
    getData: function(){
      return this.width;
    },
    setShape: function(){
      return false;
    },

    /**
     * Path can not be draggable in this implementation
     * @param v boolean
     */
    setDraggable: function(v){
      return false;
    },
    getDraggable: function(){
      return false;
    }
  };

  /**
   * Circle
   * @param args
   * @constructor
   */
  YOVALUE.SVGDrawer.Circle = function(baseShape, args){
    YOVALUE.mixin(baseShape, this);
    this.shape = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    baseShape.setShape(this.shape);
    baseShape.init();
    this.setRadius(args.radius);
  };

  YOVALUE.SVGDrawer.Circle.prototype = {
    setRadius: function(v){
      this.radius = v;
      this.getShape().setAttributeNS(null, "r",  this.radius);
    },
    getRadius: function(){
      return this.radius;
    },
    setShape: function(){
      return false;
    }
  };

  /**
   * Text
   * @param args
   * @constructor
   */
  YOVALUE.SVGDrawer.Text = function(baseShape, args){
    YOVALUE.mixin(baseShape, this);
    this.shape = document.createElementNS("http://www.w3.org/2000/svg", "text");
    baseShape.setShape(this.shape);
    baseShape.init();
    this.setText(args.text);
    this.setFontFamily(args.fontFamily);
    this.setFontSize(args.fontSize);
  };

  YOVALUE.SVGDrawer.Text.prototype = {
    setText: function(v){
      this.text = v;
      this.getShape().textContent  = v;
    },
    getText: function(){
      return this.text;
    },

    setFontFamily: function(v){
      this.fontFamily = v;
      this.getShape().setAttributeNS(null, "font-family",  v);
    },
    getFontFamily: function(){
      return this.fontFamily;
    },

    setFontSize: function(v){
      this.fontSize = v;
      this.getShape().setAttributeNS(null, "font-size",  v);
    },
    getFontSize: function(){
      return this.fontSize;
    },

    setShape: function() {
      return false;
    },

    /**
     * Text can not be draggable in this implementation
     * @param v boolean
     */
    setDraggable: function(v){
      return false;
    },
    getDraggable: function(){
      return false;
    }

  };

  /**
   * This functions extends object 'extendme' with functions of object 'base'
   * If the function A already exists in  'extendme', then it does not touch it
   * @param base - object that donate its functions
   * @param extendme - object that is extended
   */
  YOVALUE.mixin = function(base, extendme){
    var prop;
    for(prop in base){
      if(typeof base[prop] === 'function'
        && !extendme[prop]){
        extendme[prop] = base[prop].bind(base);
      }
    }
  };


  YOVALUE.typeof = function(obj) {
    return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
  };

  YOVALUE.isObjectInArray = function (array, obj) {
    var i;
    for (i = 0; i < array.length; i++) {
      if (array[i] === obj) {
        return true;
      }
    }

    return false;
  };

  YOVALUE.getBrowserInfo = function(){
    var ua= navigator.userAgent, tem,
      M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if(/trident/i.test(M[1])){
      tem=  /\brv[ :]+(\d+)/g.exec(ua) || [];
      return 'IE '+(tem[1] || '');
    }
    if(M[1]=== 'Chrome'){
      tem= ua.match(/\b(OPR|Edge)\/(\d+)/);
      if(tem!= null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
    }
    M= M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
    if((tem= ua.match(/version\/(\d+)/i))!= null) M.splice(1, 1, tem[1]);
    return {'type':M[0], 'ver':M[1]};
  };

  // CustomEvent for IE
  (function () {
    function CustomEvent ( event, params ) {
      params = params || { bubbles: false, cancelable: false, detail: undefined };
      var evt = document.createEvent( 'CustomEvent' );
      evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
      return evt;
    }

    CustomEvent.prototype = window.Event.prototype;

    window.CustomEvent = CustomEvent;
  })();
/*--------------------------------------*/

</script>

<div id="container"></div>

</body>
</html>
