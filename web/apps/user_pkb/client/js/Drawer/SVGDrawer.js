/**
 *
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
  this.shapeCallbacks = {};
  this.stageCallbacks = {};
  document.getElementById(stageContainerId).appendChild(this.svgroot);
  this._createSVGDragEvent();
  this._initEventHandler();
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
    return layer_id;
  },
  removeLayer: function(layer_id){
    document.getElementById(layer_id).parentNode.removeChild(document.getElementById(layer_id));
  },
  drawLayer: function(layer_id){},



  /**
   * Hide layer
   * @param layer_id
   */
  hideLayer: function(layer_id){
    document.getElementById(layer_id).style.display = 'none';
  },

  /**
   * Show layer
   * @param layer_id
   */
  showLayer: function(layer_id){
    document.getElementById(layer_id).style.display = 'block';
  },

  /**
   * Adds shape to the layer
   * @param layer_id
   * @param shape
   */
  addShape: function(layer_id, shape){
    this.shapes[shape.getId()] = shape;
    document.getElementById(layer_id).appendChild(shape.getShape());
    shape.setXY(shape.getXY());

    var that = this;
    this.elementEventNames = ['mouseenter', 'mouseleave'];
    for(var i in this.elementEventNames){
      var event = this.elementEventNames[i];
      shape.getShape().addEventListener(event, function(e){
        that._eventHandler(e, that);
      }, false);
    }
  },

  removeShape: function(shape){
    delete this.shapes[shape.getId()];
    var dom = document.getElementById(shape.getId());
    dom.parentElement.removeChild(dom);
  },

  /**
   * Bind callback to shape
   * @param eventName - one of this names SVGDrawer.eventNames
   * @param shape
   * @param callback
   * @return {Number} - bindId which can be used later in unbindShape
   */
  bindShape: function(eventName, shape, callback){
    return this.addEventListener(eventName, callback, null, shape.getId());
  },
  unbindShape: function(bindId){
    this.removeEventListener(bindId);
  },

  /**
   * Mute and unmute certain shapes
   * @param shapeId
   * @param mute - boolean: true to mute, false to unmute
   */
  muteShape: function(shape, mute){
    var callbacks = this.shapeCallbacks.getRows({shapeId:shape.getId()});
    for(var i in callbacks) callbacks[i]['isMuted'] = mute;
    shape.getShape().setAttribute('pointer-events', mute ? 'none' : 'visiblePainted');
  },

  /**
   * Bind 'mousemove', 'touchmove' to stage
   * @param callback
   * @param area - {centerX:x, centerY:y, width:w, height:h} is area of stage for mousemove event.
   * Example: {centerX:10, centerY:10, width:5, height:5} means a rectangle with center
   * positioned 10 pixels to the right and 10 to bottom from left top corner of stage.
   * @return callbackId - id of callback that can be used later in unbindStage to unbind this callback
   */
  bindStageMove: function(callback, area){
    var that = this, uniqId = YOVALUE.getUniqId(),
      x1 = area.centerX - area.width/2,
      x2 = area.centerX + area.width/2,
      y1 = area.centerY - area.height/2,
      y2 = area.centerY + area.height/2;
    this.stageCallbacks[uniqId] = function(e){
      var relX = e.clientX - that.svgroot.getBoundingClientRect().left;
      var relY = e.clientY - that.svgroot.getBoundingClientRect().top;
      if( relX > x1 && relX < x2 && relY > y1 && relY < y2){
        callback({x:relX, y:relY});
      }
    };
    this.svgroot.addEventListener('mousemove', this.stageCallbacks[uniqId], false);
    this.svgroot.addEventListener('touchmove', this.stageCallbacks[uniqId], false);
    return uniqId;
  },
  unbindStageMove: function(bindId){
    this.svgroot.removeEventListener('mousemove', this.stageCallbacks[bindId], false);
    delete this.stageCallbacks[bindId];
  },
  muteStageMove: function(bindId, mute){
    if(mute) this.svgroot.removeEventListener('mousemove', this.stageCallbacks[bindId], false);
    else this.svgroot.addEventListener('mousemove', this.stageCallbacks[bindId], false);
  },

  /**
   * Get all shapes that have (x,y) point
   * @param x
   * @param y
   * @return {*}
   */
  getIntersections: function(x,y){
    var shapesUnderPoint = [], el, i;
    if(false && this.svgroot.getIntersectionList && YOVALUE.getBrowserInfo().type != "Safari") {
      var hitRect = this.svgroot.createSVGRect();
      hitRect.height = 1;
      hitRect.width = 1;
      hitRect.y = y;
      hitRect.x = x;
      var els = this.svgroot.getIntersectionList(hitRect, null);
      var arrayLength = els.length;
      for(i=0; i<arrayLength; i++){
        el = els[i];
        shapesUnderPoint.push(this.shapes[el.getAttribute('id')]);
      }
    }
    // hack for firefox (ver 43.0.4 still does not support getIntersectionList)
    // safari 5.1.7 under windows also does not seem to getIntersectionList properly
    else {
      var i, id, shapePointerEvents = {};
      // save attribute pointer-events for all shapes
      for(id in this.shapes) shapePointerEvents[id] = this.shapes[id].getShape().getAttribute('pointer-events');
      // test every shape for (x, y) overlap
      for(id in this.shapes){
        for(i in this.shapes) this.shapes[i].getShape().setAttribute('pointer-events', 'none');
        this.shapes[id].getShape().setAttributeNS(null, 'pointer-events', 'visiblePainted');
        el = document.elementFromPoint(x, y);
        if(!YOVALUE.isObjectInArray(shapesUnderPoint, el) && typeof(this.shapes[el.getAttribute('id')]) != 'undefined') shapesUnderPoint.push(this.shapes[el.getAttribute('id')]);
      }
      // restore original pointer-events attribute
      for(id in this.shapes) shapePointerEvents[id] = this.shapes[id].getShape().setAttribute('pointer-events', shapePointerEvents[id]);
    }

    return shapesUnderPoint;
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
   * Adds SVGDrawer callback for events of type SVGDrawer.eventNames
   * on all shapes with class classname
   * @private
   */
  _initEventHandler: function(){
    var i, event;
    this.documentEventNames = ['click', 'dragstart', 'dragging', 'dragend'];
    this.shapeCallbacks = new YOVALUE.Table(['id', 'eventName', 'shapeId', 'shapeClass', 'callback', 'isMuted']);
    var that = this;

    for(i in this.documentEventNames){
      event = this.documentEventNames[i];
      this.svgroot.addEventListener(event, function(e){
        that._eventHandler(e, that);
      }, false);
    }
  },

  _eventHandler: function(e, that){
    var j, targetId, layerX, layerY;
    console.log(e.type);
    if(['dragstart', 'dragging', 'dragend'].indexOf(e.type) != -1){
      targetId = e.detail.id;
      layerX = e.detail.x;
      layerY = e.detail.y;
    } else{
      targetId = e.target.id;
      layerX = e.layerX;
      layerY = e.layerY;
    }
    var shape = that.shapes[targetId];

    // callbacks registered for all shapes
    var generalCallbacks = that.shapeCallbacks.getRows({eventName:e.type, shapeId: null, shapeClass: null, isMuted:false});
    // callbacks registered for shape class
    var shapeClassCallbacks = typeof shape.getClass() == 'undefined' ? [] : that.shapeCallbacks.getRows({eventName:e.type, shapeClass: shape.getClass(), isMuted:false});
    // callbacks registered for this shape id
    var shapeIdCallbacks = that.shapeCallbacks.getRows({eventName:e.type, shapeId: shape.getId(), isMuted:false});
//            console.log(e.type, generalCallbacks);
    var event = {targetNode:shape, layerX: layerX, layerY: layerY, x:layerX, y:layerY, pageX:layerX, pageY:layerY};
    for(j in generalCallbacks) generalCallbacks[j]['callback'](event, shape);
    for(j in shapeClassCallbacks) shapeClassCallbacks[j]['callback'](event, shape);
    for(j in shapeIdCallbacks) shapeIdCallbacks[j]['callback'](event, shape);
  },

  /**
   * Register user callback for events SVGDrawer.eventNames
   */
  addEventListener: function(eventName, callback, className, shapeId){
    var uniqId = YOVALUE.getUniqId();
    this.shapeCallbacks.insertRow({
      id:uniqId,
      eventName:eventName,
      callback:callback,
      shapeClass: typeof className == 'undefined' ? null : className,
      shapeId: typeof shapeId == 'undefined' ? null : shapeId,
      isMuted: false
    });
    return uniqId;
  },

  /**
   * Remove event callback
   * @param uniqId
   */
  removeEventListener: function(uniqId){
    this.shapeCallbacks.removeRows({id:uniqId});
  },

  _getEventAbsXY: function(evt){
    var xOffset=Math.max(document.documentElement.scrollLeft,document.body.scrollLeft);
    var yOffset=Math.max(document.documentElement.scrollTop,document.body.scrollTop);
    var x = evt.type.substr(0, 5) == "mouse" ? evt.clientX + xOffset : evt.changedTouches[0].clientX;
    var y = evt.type.substr(0, 5) == "mouse" ? evt.clientY + yOffset : evt.changedTouches[0].clientY;
    return {x:x, y:y};
  },

  _createSVGDragEvent: function(){
    this.dragstartEventSend = false;
    var that = this;
    var handler = function(evt){
      var shape;
      var xy = that._getEventAbsXY(evt);

      // ignore 2 touch gestures like zoom gesture
      if(evt.type.substr(0, 5) == 'touch' && evt.touches.length == 2) return true;

      // fix for firefox image dragging do not interfere with our custom dragging
      if(evt.type.substr(0, 5) != 'touch') evt.preventDefault();

      // if not mousemove
      if(evt.type != "mousemove" && evt.type != "touchmove"){

        shape = that.shapes[evt.target.id];

        if(!shape) return;
        if(!shape.getDraggable()) return;

        if(evt.type == "mousedown" || evt.type == "touchstart"){
          shape.mousedown = true;
        }

        if((evt.type == "mouseup" || evt.type == "touchend") && shape.mousedown == true){
          shape.mousedown = false;
          if(that.dragstartEventSend === true){
            var myEvent = new CustomEvent("dragend", {detail:{id: shape.getId(), x:xy.x, y:xy.y}});
            that.svgroot.dispatchEvent(myEvent);
            that.dragstartEventSend = false;
            evt.preventDefault();
          }
        }

      }else{
        for(var id in that.shapes){
          shape = that.shapes[id];
          if(shape.mousedown && shape.getDraggable()){
            // do not drag screen on touch device
            evt.preventDefault();
            if(!that.dragstartEventSend){
              var myEvent = new CustomEvent("dragstart", {detail:{id: shape.getId(), x:xy.x, y:xy.y}});
              that.dragstartEventSend = true;
              that.svgroot.dispatchEvent(myEvent);
            }
            var myEvent = new CustomEvent("dragging", {detail:{id: shape.getId(), x:xy.x, y:xy.y}});
            that.svgroot.dispatchEvent(myEvent);
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
    var that = this;
    this.addEventListener('dragend', function(evt, shape){
      if(that.dragShapeLayer == null) return;
      that.dragPointerStartXY = {x: evt.layerX, y: evt.layerY};
      that.dragShapeStartXY = {x: shape.getX(), y: shape.getY()};
      // move shape to its layer
      that.dragShapeLayer.appendChild(shape.getShape());
      that.dragShapeLayer = null;
    });

    this.addEventListener('dragstart', function(evt, shape){
      that.dragPointerStartXY = {x: evt.layerX, y: evt.layerY};
      that.dragShapeStartXY = {x: shape.getX(), y: shape.getY()};
      // move shape to front
      that.dragShapeLayer = shape.getShape().parentNode;
      that.svgroot.appendChild(shape.getShape());
    });

    this.addEventListener('dragging', function(evt, shape){
      // update shapes (x, y)
      shape.setXY({
        x:(that.dragShapeStartXY.x + evt.layerX - that.dragPointerStartXY.x),
        y:(that.dragShapeStartXY.y + evt.layerY - that.dragPointerStartXY.y)
      });
    });
  }

};
/**
 * BaseShape
 * @param args
 * @constructor
 */
YOVALUE.SVGDrawer.BaseShape = function(args){
  this.id = typeof args.id == 'undefined' ? YOVALUE.getUniqId() : args.id;
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
  //  console.log(this.id);
  //  console.log(printStackTrace());
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
   * Set center of the shape to x, y
   */
  setXY: function(p){
    this.setX(p.x);
    this.setY(p.y);
  },
  getXY: function(){
    return {x: this.x, y: this.y};
  },

  setX: function(v){
    if(YOVALUE.typeof(v) != 'number') return false;
    // circle in svg is positioned by center coordinates, rectangle by its left up corner, text by its left bottom corner
    this.matrix[4] = this.shape.nodeName == 'circle' ? v : v-this.getBBox().width/2;
    if(this.shape) this.shape.setAttributeNS(null, "transform", "matrix("+ this.matrix.join(' ') +")");
    this.x = v;
    return true;
  },
  getX: function(){
    return this.x;
  },

  setY: function(v){
    if(YOVALUE.typeof(v) != 'number') return false;
    // circle in svg is positioned by center coordinates, rectangle by its left up corner, text by its left bottom corner
    this.matrix[5] = this.shape.nodeName == 'circle' ? v : v-this.getBBox().height/2;
    if(this.shape.nodeName == 'text') this.matrix[5] += this.getBBox().height;
    if(this.shape) this.shape.setAttributeNS(null, "transform", "matrix("+ this.matrix.join(' ') +")");
    this.y = v;
    return true;
  },
  getY: function(){
    return this.y;
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
  },

  getWidth: function(){
    return this.getBBox().width;
  },

  getHeight: function(){
    return this.getBBox().height;
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

  // not implemented yet
  setRotation: function(v){
    // do smth with transform
  },

  getRotation: function(){

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