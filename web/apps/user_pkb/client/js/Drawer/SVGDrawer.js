/**
 *
 * @type {Object}
 */
GRASP.SVGDrawer = function(stageContainerId, stageContainerWidth, stageContainerHeight){
  this.id = GRASP.getUniqId();
  this.stageContainerId = stageContainerId;
  this.svgns = "http://www.w3.org/2000/svg";
  this.svgroot = document.createElementNS(this.svgns, "svg");
  this.svgroot.setAttribute("id", this.id);
  this.svgroot.setAttribute("width", stageContainerWidth);
  this.svgroot.setAttribute("height", stageContainerHeight);
  this.svgroot.setAttribute("display", "block");
  this.shapes = {}; // all shapes added by addShape()
  this.shapeCallbacks = {};
  this.stageCallbacks = {};

  // svg definition section, where SVG holds marker definitions
  this.defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  this.svgroot.appendChild(this.defs);
  this.markers = {}; // list of markers id: marker

  document.getElementById(stageContainerId).appendChild(this.svgroot);
  this._createSVGDragEvent();
  this._createDoubleTapEvent();
  this._initEventHandler();
  this._makeShapesDraggable();
};

GRASP.SVGDrawer.prototype = {
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
        that._eventHandler(e, that, shape.getId());
      }, false);
    }
  },

  removeShape: function(shape){
    delete this.shapes[shape.getId()];
    var dom = document.getElementById(shape.getId());
    dom.parentNode.removeChild(dom);
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
    var that = this, uniqId = GRASP.getUniqId(),
      x1 = area.centerX - area.width/2,
      x2 = area.centerX + area.width/2,
      y1 = area.centerY - area.height/2,
      y2 = area.centerY + area.height/2;
    this.stageCallbacks[uniqId] = function(e){
      var xy = that._getEventAbsXY(e);
      var relX = xy.x - that.svgroot.getBoundingClientRect().left;
      var relY = xy.y - that.svgroot.getBoundingClientRect().top;
      if( relX > x1 && relX < x2 && relY > y1 && relY < y2){
        callback(xy);
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
    if(false && this.svgroot.getIntersectionList && GRASP.getBrowserInfo().type != "Safari") {
      var hitRect = this.svgroot.createSVGRect();
      hitRect.height = 1;
      hitRect.width = 1;
      hitRect.y = y;
      hitRect.x = x;
      var els = this.svgroot.getIntersectionList(hitRect, null);
      var arrayLength = els.length;
      for(i=0; i<arrayLength; i++){
        el = els[i];
        shapesUnderPoint.push(this._getShapeIdByEventTarget(el));
      }
    }
    // hack for firefox (ver 43.0.4 still does not support getIntersectionList)
    // safari 5.1.7 under windows also does not seem to getIntersectionList properly
    else {
      var i, id = null, shapePointerEvents = {}, count = 0;

      while(id != this.svgroot.getAttribute('id') && count<10){
        count++;
        el = document.elementFromPoint(x, y);
        id = this._getShapeIdByEventTarget(el);

        if(typeof(this.shapes[id]) != 'undefined'){
          if(!GRASP.isObjectInArray(shapesUnderPoint, this.shapes[id])) shapesUnderPoint.push(this.shapes[id]);
          shapePointerEvents[id] = this.shapes[id].getShape().getAttribute('pointer-events');
          this.shapes[id].getShape().setAttribute('pointer-events', 'none');
        }
      }

      // restore original pointer-events attribute
      for(id in shapePointerEvents) this.shapes[id].getShape().setAttribute('pointer-events', shapePointerEvents[id]);
/*

      // save attribute pointer-events for all shapes
      for(id in this.shapes) shapePointerEvents[id] = this.shapes[id].getShape().getAttribute('pointer-events');
      // test every shape for (x, y) overlap
      for(id in this.shapes){
        for(i in this.shapes) this.shapes[i].getShape().setAttribute('pointer-events', 'none');
        this.shapes[id].getShape().setAttributeNS(null, 'pointer-events', 'visiblePainted');
        el = document.elementFromPoint(x, y);
        if(!GRASP.isObjectInArray(shapesUnderPoint, el) && typeof(this.shapes[el.getAttribute('id')]) != 'undefined') shapesUnderPoint.push(this.shapes[el.getAttribute('id')]);
      }
      // restore original pointer-events attribute
      for(id in this.shapes) shapePointerEvents[id] = this.shapes[id].getShape().setAttribute('pointer-events', shapePointerEvents[id]);
 */
    }

    return shapesUnderPoint;
  },

  createGroup: function(args){
    return new GRASP.SVGDrawer.Group(new GRASP.SVGDrawer.BaseShape(args));
  },

  createMarker: function(id, scale, color){
    if(typeof this.markers[id] != 'undefined') return null;

    this.markers[id] = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    this.markers[id].setAttribute('id', id);
    this.markers[id].setAttribute('refX', 12*scale);
    this.markers[id].setAttribute('refY', 6*scale);
    this.markers[id].setAttribute('markerUnits', 'userSpaceOnUse');
    this.markers[id].setAttribute('markerWidth', 30*scale);
    this.markers[id].setAttribute('markerHeight', 30*scale);
    this.markers[id].setAttribute('orient', 'auto');

    this.path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    this.path.setAttribute('d', 'M 0 0 12 6 0 12 3 6');
    this.path.setAttribute('transform', 'scale('+scale+')');
    this.path.setAttribute('fill', color);

    this.markers[id].appendChild(this.path);
    this.defs.appendChild(this.markers[id]);
  },

  createShape: function(type, args){
    if(type == 'circle'){
      return new GRASP.SVGDrawer.Circle(new GRASP.SVGDrawer.BaseShape(args), args);
    }else if(type == 'rectangle'){
      return new GRASP.SVGDrawer.Rect(new GRASP.SVGDrawer.BaseShape(args), args);
    }else if(type == 'path'){
      return new GRASP.SVGDrawer.Path(new GRASP.SVGDrawer.BaseShape(args), args);
    }else if(type == 'text'){
      return new GRASP.SVGDrawer.Text(new GRASP.SVGDrawer.BaseShape(args), args);
    }else if(type == 'svg'){
      return new GRASP.SVGDrawer.SVG(new GRASP.SVGDrawer.BaseShape(args), args);
    }
  },

  getSVGRoot: function() {
    return this.svgroot
  },

  /**
   * @private
   */
  _initEventHandler: function(){
    var i, event;
    this.documentEventNames = ['dblclick', 'dbltap', 'click', 'dragstart', 'dragging', 'dragend'];
    this.shapeCallbacks = new GRASP.Table(['id', 'eventName', 'shapeId', 'shapeClass', 'callback', 'isMuted']);
    var that = this;

    for(i in this.documentEventNames){
      event = this.documentEventNames[i];
      this.svgroot.addEventListener(event, function(e){
        that._eventHandler(e, that);
      }, false);
    }
  },

  /**
   *
   * @param e
   * @param that
   * @param opt_shapeId - optional
   * @private
   */
  _eventHandler: function(e, that, opt_shapeId){
    var j, targetId, target, xy, eventType;
    // console.log(e.type, e);
    // e.preventDefault(); 

    // our custom events
    if(['dragstart', 'dragging', 'dragend', 'dbltap'].indexOf(e.type) != -1){
      targetId = e.detail.id;
      target = e.detail.target;
      xy = {x:e.detail.x, y:e.detail.y};
    }
    // standard double click events
    else {
      targetId = e.target.id;
      target = e.target;
      xy = this._getEventAbsXY(e);
    }

    targetId = that._getShapeIdByEventTarget(target);
    var shape = that.shapes[targetId];

    if(e.type == 'dbltap'){
      eventType = 'dblclick'
    }else{
      eventType = e.type;
    }

    /*
    if(e.type == 'mouseenter' || e.type == 'mouseleave' || e.type == 'mouseover' || e.type == 'mouseout'){
       console.log('SVGDrawer received event '+e.type+' shapeId = ', targetId, opt_shapeId, that.shapes[opt_shapeId], that.shapes[targetId],  that.shapes[targetId].getXY());
    }
    */
    if(DEBUG_MODE){
      //GRASP.logger.log('SVGDrawer received event '+e.type+' shapeId = ', targetId, GRASP.clone(that.shapes[targetId].getXY()), GRASP.clone(that.shapes[targetId]));
    }

    if(typeof shape == 'undefined') return;

    // callbacks registered for all shapes
    var generalCallbacks = that.shapeCallbacks.getRows({eventName:e.type, shapeId: null, shapeClass: null, isMuted:false});
    // callbacks registered for shape class
    var shapeClassCallbacks = typeof shape.getClass() == 'undefined' ? [] : that.shapeCallbacks.getRows({eventName:e.type, shapeClass: shape.getClass(), isMuted:false});
    // callbacks registered for this shape id
    var shapeIdCallbacks = that.shapeCallbacks.getRows({eventName:eventType, shapeId: shape.getId(), isMuted:false});
//            console.log(e.type, generalCallbacks);
    var event = {type:eventType, targetNode:shape, x:xy.x, y:xy.y};

    if(DEBUG_MODE){
      GRASP.debug.printEvent(undefined,'SVGDrawer', '295:5', 'fire', event.type, event, GRASP.getObjectId(event));

      //GRASP.logger.log('SVGDrawer is going to fire event ',GRASP.clone(event));
    }

    for(j in generalCallbacks) generalCallbacks[j]['callback'](event, shape);
    for(j in shapeClassCallbacks) shapeClassCallbacks[j]['callback'](event, shape);
    for(j in shapeIdCallbacks) shapeIdCallbacks[j]['callback'](event, shape);
  },

  /**
   * Register user callback for events SVGDrawer.eventNames
   */
  addEventListener: function(eventName, callback, className, shapeId){
    var uniqId = GRASP.getUniqId();
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

  /**
   * Return x, y where (0,0) is top left of svg
   * @param evt
   * @returns {*}
   * @private
   */
  _getEventRelativeXY: function(evt){
    if(typeof evt == 'undefined' || typeof evt.type == 'undefined') return false;

    var rect = this.svgroot.getBoundingClientRect()

    var x = evt.type.indexOf("touch") == -1 ? evt.pageX : evt.changedTouches[0].pageX;
    var y = evt.type.indexOf("touch") == -1 ? evt.pageY : evt.changedTouches[0].pageY;

    return {x:x - rect.left, y:y - rect.top};
  },

  /**
   * Return x, y where (0, 0) is the top left of web page
   * @param evt
   * @returns {*}
   * @private
   */
  _getEventAbsXY: function(evt){
    if(typeof evt == 'undefined' || typeof evt.type == 'undefined') return false;

    var x = evt.type.indexOf("touch") == -1 ? evt.pageX : evt.changedTouches[0].pageX;
    var y = evt.type.indexOf("touch") == -1 ? evt.pageY : evt.changedTouches[0].pageY;

    return {x:x, y:y};
  },

  _createDoubleTapEvent: function(){
    var latesttap = 0;
    var that = this;
    this.svgroot.addEventListener('touchstart', function(evt){
      // skip gestures with more than two fingers
      if(evt.touches.length > 1) return;

      var xy = that._getEventAbsXY(evt);

      var now = new Date().getTime();
      var timesince = now - latesttap;
      if((timesince < 600) && (timesince > 0)){
        // this is doubletap, baby
        evt.preventDefault();
        var targetId = that._getShapeIdByEventTarget(evt.target);
        var shape = that.shapes[targetId];
        var myEvent = new CustomEvent("dbltap", {detail:{
            id: shape.getId(),
            x:xy.x,
            y:xy.y,
            target:shape.getShape()
        }});
        that.svgroot.dispatchEvent(myEvent);
      }else{
        // too much time to be a doubletap
      }
      latesttap = new Date().getTime();
    }, false);
  },

  _createSVGDragEvent: function(){
    this.dragstartEventSend = false;
    this.dragstartShape = null;
    var that = this;
    var handler = function(evt){
      var shape;
      var xy = that._getEventAbsXY(evt);

      // ignore 2 touch gestures like zoom gesture
      if(evt.type.substr(0, 5) == 'touch' && evt.touches.length == 2) return true;

      // fix for firefox image dragging do not interfere with our custom dragging
   //   if(evt.type.substr(0, 5) != 'touch') evt.preventDefault();

      // if not mousemove
      if(evt.type == "mousedown" || evt.type == "mouseup" || evt.type == "touchstart" || evt.type == "touchend"){

        var targetId = that._getShapeIdByEventTarget(evt.target);
        shape = that.shapes[targetId];

        if((evt.type == "mouseup" || evt.type == "touchend") && (that.dragstartEventSend || (shape != null && shape.mousedown === true))){
          shape = shape == null ? that.dragstartShape : shape;
          shape.mousedown = false;
          if(that.dragstartEventSend === true){
            var myEvent = new CustomEvent("dragend", {detail:{
                id: shape.getId(),
                x:xy.x,
                y:xy.y,
                target:shape.getShape()
              }});
            that.svgroot.dispatchEvent(myEvent);
            that.dragstartEventSend = false;
            that.dragstartShape = null;
            evt.preventDefault();
          }
        }

        if(!shape) return;
        if(!shape.getDraggable()) return;

        if(evt.type == "mousedown" || evt.type == "touchstart"){
          shape.mousedown = true;
          shape.mousedownXY = xy;
        }

      }else if(evt.type == "mousemove" || evt.type == "touchmove"){
        for(var id in that.shapes){
          shape = that.shapes[id];
          if(shape.mousedown && shape.getDraggable()){

            // if mousemove has the same xy as mousedown it is not real move, we ignore it
            if(shape.mousedownXY.x == xy.x && shape.mousedownXY.y == xy.y) continue;

            // do not drag screen on touch device
            evt.preventDefault();
            if(!that.dragstartEventSend){
              var myEvent = new CustomEvent("dragstart", {detail:{
                id: shape.getId(),
                x:xy.x,
                y:xy.y,
                target:shape.getShape()
              }});
              that.dragstartEventSend = true;
              that.dragstartShape = shape;
              that.svgroot.dispatchEvent(myEvent);
            }
            var myEvent = new CustomEvent("dragging", {detail:{
              id: shape.getId(),
              x:xy.x,
              y:xy.y,
              target: shape.getShape()
            }});
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
      that.dragPointerStartXY = {x:evt.x, y:evt.y};
      that.dragShapeStartXY = {x: shape.getX(), y: shape.getY()};
      // move shape to its layer
      that.dragShapeLayer.appendChild(shape.getShape());
      that.dragShapeLayer = null;
    });

    // evt.x evt.y is coordinates relative to top left corner of page (pageX, pageY)
    // This value is relative to the left edge of the entire document, regardless
    // of the current horizontal scrolling offset of the document.
    this.addEventListener('dragstart', function(evt, shape){

      // move element center under mouse pointer
      // (this hack is to avoid bug when sometimes element slips away from mouse after fast mouse move)
      var shapeBoundRect = shape.getShape().getBoundingClientRect();
      shape.setXY({
        x: shape.getX() - (shapeBoundRect.left + shapeBoundRect.width/2 - evt.x),
        y: shape.getY() - (shapeBoundRect.top + shapeBoundRect.height/2 - evt.y)
      });

      that.dragPointerStartXY = {x:evt.x, y:evt.y};
      that.dragShapeStartXY = {x: shape.getX(), y: shape.getY()};
      // move shape to front
      that.dragShapeLayer = shape.getShape().parentNode;
      that.svgroot.appendChild(shape.getShape());
    });

    this.addEventListener('dragging', function(evt, shape){
      // update shapes (x, y)
      shape.setXY({
        x:(that.dragShapeStartXY.x + evt.x - that.dragPointerStartXY.x),
        y:(that.dragShapeStartXY.y + evt.y - that.dragPointerStartXY.y)
      });
    });
  },

  /**
   * Sometimes event.target.id points to svg element which is only part of the shape.
   * The whole shape is represented by parent element - svg group.
   * @param target - DOM element
   * @returns {*}
   * @private
   */
  _getShapeIdByEventTarget: function(target){
    // check element and every parent until shapeId is found
    var el = target;
    while(el){
      if (el.id && typeof(this.shapes[el.id]) !== 'undefined') {
        return el.id;
      } else {
        el = el.parentNode;
      }
    }

    return null;
  }
};

/**
 * BaseShape
 * @param args
 * @constructor
 */
GRASP.SVGDrawer.BaseShape = function(args){
  this.id = typeof args.id == 'undefined' ? GRASP.getUniqId() : args.id;
  this.x = typeof args.x == 'undefined' ? 0 : args.x;
  this.y = typeof args.y == 'undefined' ? 0 : args.y;
  this.matrix = [1, 0, 0, 1, this.x, this.y];
  this.fill = args.fill;
  this.opacity = args.opacity;
  this.stroke = args.stroke;
  this.strokeWidth = args.strokeWidth;
  this.strokeDasharray = args.strokeDasharray;
  this.draggable = args.draggable;
  this.mousedown = false;
  this.shape = null; // DOM (SVG) element, should be redefined in final shape class
};

GRASP.SVGDrawer.BaseShape.prototype = {
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

  getType: function(){
    return this.shape.tagName.toLowerCase();
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

  /**
   * Circle in svg is positioned by center coordinates,
   * rectangle by its left up corner, text by its left bottom corner.
   *
   * We position circle by center, rectangle and text by its left up corner
   * @param v
   * @returns {boolean}
   */
  setX: function(v){
    if(GRASP.typeof(v) != 'number') return false;
    this.matrix[4] = v;
    if(this.shape) this.shape.setAttributeNS(null, "transform", "matrix("+ this.matrix.join(' ') +")");
    this.x = v;
    return true;
  },
  getX: function(){
    return this.x;
  },

  setY: function(v){
    if(GRASP.typeof(v) != 'number') return false;
    // circle in svg is positioned by center coordinates, rectangle by its left up corner, text by its left bottom corner
    this.matrix[5] = v;
   // if(this.shape.nodeName == 'text') this.matrix[5] += this.getBBox().height;
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

  setStrokeDasharray: function(v){
    this.strokeDasharray = v;
    this.shape.setAttributeNS(null, "stroke-dasharray", v);
  },
  getStrokeDasharray: function(){
    return this.strokeDasharray;
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
    return {x:GRASP.typeof(this.x)=='number'?this.x:(bbox.x+bbox.width/2), y:GRASP.typeof(this.y)=='number'?this.y:(bbox.y+bbox.height/2), width:bbox.width, height:bbox.height};
  },

  getWidth: function(){
    return this.getBBox().width;
  },

  getHeight: function(){
    return this.getBBox().height;
  }
};

/**
 * SVG
 * Create SVG from SVG XML string
 * @param baseShape - GRASP.SVGDrawer.BaseShape
 * @param args - {svgxml:"<svg xmlns='http://www.w3.org/2000/svg' width='25' height='25'><path d='M12.017,5.974L19.536,19H4.496L12.017,5.974 M12.017,3.5c-0.544,0-1.088,0.357-1.5,1.071L2.532,18.402C1.707,19.831,2.382,21,4.032,21H20c1.65,0,2.325-1.169,1.5-2.599L13.517,4.572C13.104,3.857,12.561,3.5,12.017,3.5L12.017,3.5z'/></svg>"}
 * @constructor
 */
GRASP.SVGDrawer.SVG = function(baseShape, args){
  GRASP.mixin(baseShape, this);
  var doc = GRASP.DOMParser.parseFromString(args.svgxml, "image/svg+xml");
  this.shape = doc.documentElement;
  baseShape.setShape(this.shape);
  baseShape.init();

  this.children = {};
};

GRASP.SVGDrawer.SVG.prototype = {
  setX: function(v){
    if(GRASP.typeof(v) != 'number') return false;
    if(this.shape) this.shape.setAttributeNS(null, "x", v);
    this.x = v;
    return true;
  },

  setY: function(v){
    if(GRASP.typeof(v) != 'number') return false;
    if(this.shape) this.shape.setAttributeNS(null, "y", v);
    this.y = v;
    return true;
  }
};

/**
 * Group
 * You can add shapes to group, remove them and set x, y of group.
 * @constructor
 */
GRASP.SVGDrawer.Group = function(baseShape){
  GRASP.mixin(baseShape, this);
  this.shape = document.createElementNS("http://www.w3.org/2000/svg", "g");
  baseShape.setShape(this.shape);
  baseShape.init();

  this.children = {};
};

GRASP.SVGDrawer.Group.prototype = {
  /**
   * Add GRASP.SVGDrawer.<ShapeName> to GRASP.SVGDrawer.Group
   * @param e - GRASP.SVGDrawer.<ShapeName>
   */
  add: function(e){
    this.children[e.getShape().id] = e;
    this.shape.appendChild(e.getShape());
  },

  /**
   * Remove GRASP.SVGDrawer.<ShapeName> from GRASP.SVGDrawer.Group by shape id
   * @param id - GRASP.SVGDrawer.<ShapeName>.getShape().getId()
   */
  remove: function(id){
    var el = document.getElementById(id);
    this.shape.removeChild(el);
    delete this.children[id];
  },

  getChildren: function(){
    return this.children;
  }
};

/**
 * Rectangle
 * @constructor
 */
GRASP.SVGDrawer.Rect = function(baseShape, args){
  GRASP.mixin(baseShape, this);
  this.shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  baseShape.setShape(this.shape);
  baseShape.init();
  this.setWidth(args.width);
  this.setHeight(args.height);
};

GRASP.SVGDrawer.Rect.prototype = {
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
GRASP.SVGDrawer.Path = function(baseShape, args){
  GRASP.mixin(baseShape, this);
  this.shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
  baseShape.setShape(this.shape);
  baseShape.init();
  this.setData(args.data);
  this.setWidth(args.width);
};

GRASP.SVGDrawer.Path.prototype = {
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

  setWidth: function(v){
    this.getShape().setAttribute("stroke-width",  v);
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
  },

  /**
   *
   * @param url
   */
  setMarkerEnd: function(url){
    this.getShape().setAttribute("marker-end", url);
  },

  /**
   *
   * @param url
   */
  setMarkerStart: function(url){
    this.getShape().setAttribute("marker-start", url);
  }
};

/**
 * Circle
 * @param args
 * @constructor
 */
GRASP.SVGDrawer.Circle = function(baseShape, args){
  GRASP.mixin(baseShape, this);
  this.shape = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  baseShape.setShape(this.shape);
  baseShape.init();
  this.setRadius(args.radius);
  this.setFillOpacity(args.fillOpacity);
  this.setStrokeColor(args.stroke);
  this.setStrokeOpacity(args.strokeOpacity);
};

GRASP.SVGDrawer.Circle.prototype = {
  setStrokeOpacity: function(v){
    if(v) this.getShape().style += 'stroke-opacity: '+v+';';
  },
  setStrokeWidth: function(v){
    if(v) this.getShape().style += 'stroke-width: '+v+';';
  },
  setStrokeColor: function(v){
    if(v) this.getShape().style += 'stroke: '+v+';';
  },
  setFillOpacity: function(v){
    if(v) this.getShape().setAttributeNS(null, "fill-opacity",  v);
  },
  getFillOpacity: function(){
    return this.getShape().getAttributeNS(null, "fill-opacity");
  },
  setRadius: function(v){
    if(v) {
      this.radius = v;
      this.getShape().setAttributeNS(null, "r",  this.radius);
    }
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
GRASP.SVGDrawer.Text = function(baseShape, args){
  GRASP.mixin(baseShape, this);
  this.shape = document.createElementNS("http://www.w3.org/2000/svg", "text");
  baseShape.setShape(this.shape);
  baseShape.init();
  this.setText(args.text);
  this.setFontFamily(args.fontFamily);
  this.setFontSize(args.fontSize);
};

GRASP.SVGDrawer.Text.prototype = {
  setText: function(v){
    v = GRASP.html2text(v);
    this.text = v;
    while (this.getShape().firstChild) {
      this.getShape().removeChild(this.getShape().firstChild);
    }
    var lines = v.split("\n");
    for(var i in lines){
      var tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
      tspan.textContent = lines[i];
      tspan.setAttributeNS(null, "x",  "0");
      tspan.setAttributeNS(null, "dy",  "0.8em");
      this.getShape().appendChild(tspan);
    }
   // this.getShape().textContent  = v;
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
