/** Common to nodejs and web helpers */
var GRASP = GRASP || {};

GRASP.html2text = function(html){
  html = html.replace(/<style([\s\S]*?)<\/style>/gi, '');
  html = html.replace(/<script([\s\S]*?)<\/script>/gi, '');
  html = html.replace(/<div>/ig, '\n');
  html = html.replace(/<\/div>/ig, '\n');
  html = html.replace(/<\/li>/ig, '\n');
  html = html.replace(/<li>/ig, '  *  ');
  html = html.replace(/<\/ul>/ig, '\n');
  html = html.replace(/<\/p>/ig, '\n');
  html = html.replace(/<br\s*[\/]?>/gi, "\n");
  html = html.replace(/<[^>]+>/ig, '');
  html = html.replace(/&nbsp;/ig, '');
  return html;
}

/**
 * Draws SVG given graph nodes, edges, labels
 */
var graphDrawer = (function(){
  // CONSTANTS
  var LABEL_FONT_FAMILY = "SFNSDisplay";
  var LABEL_FONT_SIZE_FACTOR = 1.6;
  var NODE_SIZE_FACTOR = 1.6;
  var ANIMATION_TICK = 2; // in ms
  var ANIMATION_INCREMENT = 5; // in pixels
  var ARROW_EDGE_TYPES = ['causal', 'conditional']; // in pixels

  // private module vars
  var _svgc;
  var _nodes;
  var _options;
  var _document = (typeof window !== 'undefined' && typeof window.document !== 'undefined') ?
      window.document : undefined;
  var _d3;

  return {
    setOptions: setOptions,
    eventListener: eventListener,
    showGraph: showGraph,
    setD3: setD3,
    setDocument: setDocument,
    moduleName: 'graphDrawer'
  };

  /**
   * {
   *   wrapper: wrapper,
       wrapperArea: wrapperArea,
       mappingArea: mappingArea,  - mapping area of original graph (will be resized to wrapperArea)
       orig_nodes: orig_nodes,
       edges: edges,
       nodeContents: nodeContents,
       nodeTypes: nodeTypes,
       edgeTypes: edgeTypes,
       graphAreaSidePadding: graphAreaSidePadding,
   * }
   */
  function setOptions(options) {
    _options = options;
  }

  function setD3(d3) {
    _d3 = d3;
  }

  function setDocument(document) {
    _document = document;
  }

  function eventListener(e){
    var eventName = e.getName();
    var eventData = e.getData();
    if(eventName == 'hide_all_labels'){
      _d3.selectAll('.graphLabel').style("visibility", "hidden");

    }else if(eventName == 'show_all_labels'){
      _d3.selectAll('.graphLabel').style("visibility", "visible");

    }else if(eventName == 'add_labels'){
      for(var i in eventData){
        addLabel(_nodes[eventData[i].nodeId], eventData[i].label, eventData[i].key)
      }
      updateNodeXY();

    }else if(eventName == 'remove_labels'){
      for(var i in eventData){
        _d3.selectAll('[key = "'+eventData[i]+'"]').remove();
      }
      updateNodeXY();

    }else if(eventName == 'highlight_edges'){
      _d3.selectAll('path').attr('stroke-opacity', 0.1);
      var paths = _d3.selectAll('path')[0];
      for(var i in paths) {
        var path = _d3.select(paths[i]);
        makePathTransparent(path, true);
      }

      for(var j in eventData['edges']){
        var edge = eventData['edges'][j];
        for(var i in paths) {
          var path = _d3.select(paths[i]);
          // direction insensitive
          if (
              (edge.source === path.attr('source') && edge.target === path.attr('target'))
              || (edge.source === path.attr('target') && edge.target === path.attr('source'))
          ) {
            makePathTransparent(path, false);
          }
        }
      }

    }else if(eventName == 'highlight_nodes'){
      var pickOutNodes = eventData['nodeIds'];

      _d3.selectAll('circle').filter(function (x) {
        return pickOutNodes.indexOf(_d3.select(this).attr('nodeId')) === -1;
      }).attr('fill-opacity', 0.1);
      _d3.selectAll('circle').filter(function (x) {
        return pickOutNodes.indexOf(_d3.select(this).attr('nodeId')) !== -1;
      }).attr('fill-opacity', 1);

      _d3.selectAll('.graphLabel').filter(function (x) {
        return pickOutNodes.indexOf(_d3.select(this).attr('nodeId')) === -1;
      }).attr('fill-opacity', 0.1);
      _d3.selectAll('.graphLabel').filter(function (x) {
        return pickOutNodes.indexOf(_d3.select(this).attr('nodeId')) !== -1;
      }).attr('fill-opacity', 1);

      var paths = _d3.selectAll('path')[0];
      for(var i in paths) {
        var path = _d3.select(paths[i]);
        makePathTransparent(_d3.select(paths[i]), true);
      }

    }else if(eventName == 'remove_highlights'){
      // nodes
      if(eventData.indexOf('nodes') !== -1) {
        var nodes = _options['orig_nodes'];
        var circles = _d3.selectAll('circle')[0];
        for(var i in circles){
          var circle = circles[i];
          var nodeId = _d3.select(circle).attr('nodeId');
          if(nodeId && nodes[nodeId]) _d3.select(circle).attr('fill-opacity', nodes[nodeId].opacity);
        }
      }

      // edges
      if(eventData.indexOf('edges') !== -1) {
        var paths = _d3.selectAll('path')[0];
        for(var i in paths) {
          makePathTransparent(_d3.select(paths[i]), false);
        }
//        _d3.selectAll('marker').attr('fill-opacity', 1);
      }

      // labels
      if(eventData.indexOf('labels') !== -1) {
        _d3.selectAll('.graphLabel').attr('fill-opacity', 1);
      }

    }else if(eventName == 'change_options'){
      for(var option in eventData) {
        if(option === 'graphAreaSidePadding') {
          var oldGraphAreaSidePadding = _options[option];
          _options[option] = eventData[option];
          // update mapping
          var step = oldGraphAreaSidePadding;
          var isIncr = _options['graphAreaSidePadding'] - step > 0;
          setTimeout(function tick(){
            if(isIncr) {
              step += ANIMATION_INCREMENT;
              if(step < _options['graphAreaSidePadding']) setTimeout(tick, ANIMATION_TICK)
              // last step can be incomplete
              if(
                  step > _options['graphAreaSidePadding']
                  && (step - ANIMATION_INCREMENT) < _options['graphAreaSidePadding']
              ){
                step = _options['graphAreaSidePadding'] - ANIMATION_INCREMENT;
                setTimeout(tick, ANIMATION_TICK)
              }
            } else {
              step -= ANIMATION_INCREMENT;
              if(step > _options['graphAreaSidePadding']) setTimeout(tick, ANIMATION_TICK)
              // last step can be incomplete
              if(
                  step < _options['graphAreaSidePadding']
                  && (step+ANIMATION_INCREMENT) > _options['graphAreaSidePadding']
              ){
                step = _options['graphAreaSidePadding'] + ANIMATION_INCREMENT;
                setTimeout(tick, ANIMATION_TICK)
              }
            }
            adjustNodeXY(_nodes, _options['mappingArea'], _options['wrapperArea'], step);
            updateNodeXY();
          }, ANIMATION_TICK);
        } else {
          _options[option] = eventData[option];
        }
      }
    }
  }

  function makePathTransparent(path, doTransparent){
    if (doTransparent) {
      path.attr('stroke-opacity', 0.1);
      if(ARROW_EDGE_TYPES.indexOf(path.attr('type')) !== -1) {
        path.attr("marker-end", "url(#triangle_" + path.attr('type') + "_transparent)");
      }
    } else {
      path.attr('stroke-opacity', 1);
      if(ARROW_EDGE_TYPES.indexOf(path.attr('type')) !== -1) {
        path.attr("marker-end", "url(#triangle_"+path.attr('type')+")");
      }
    }
  }

  function updateNodeXY(){
    // update nodes
    var circles = _d3.selectAll('.graphNode')[0];
    circles.forEach(function (circle) {
      var nodeId = _d3.select('#'+circle.id).attr('nodeId');
      if(nodeId && _nodes[nodeId]) {
        // update nodes
        var node = _nodes[nodeId];
        _d3.select('#'+circle.id)
            .attr('cx', node.x)
            .attr('cy', node.y);
      }
    });

    // update labels
    var labels = _d3.selectAll('.graphLabel')[0];
    labels.forEach(function (label) {
      var label = _d3.select('#'+label.id);
      var nodeId = label.attr('nodeId');
      if(nodeId && _nodes[nodeId]) {
        var node = _nodes[nodeId];
        label.attr('transform', "translate(" + node.x + "," + node.y + ")");
      }
    });

    // update edges
    var edges = _d3.selectAll('.edges')[0];
    edges.forEach(function (edge) {
      var edge = _d3.select('#'+edge.id);
      var source = edge.attr('source');
      var target = edge.attr('target');
      if(source && target && _nodes[source] && _nodes[source]) {
        edge.attr("d", getQuadPathData(_nodes[source], _nodes[target], _nodes[target].size*NODE_SIZE_FACTOR));
      }
    });
  }

  /**
   *
   * @param _nodes - [{x:x, y:y}, ...]
   * @param mappingArea - area that corresponds to current mapping of  _nodes
   * @param wrapperArea - area relative to which we calc new mappingArea (for new graphAreaSidePadding)
   * @param graphAreaSidePadding - padding relative wrapperArea (>0 - left, <0 - right)
   */
  function adjustNodeXY(_nodes, mappingArea, wrapperArea, graphAreaSidePadding){
    var w = wrapperArea.width - Math.abs(graphAreaSidePadding)*wrapperArea.width/100;
    var h = wrapperArea.height;
    var graphArea = {width: w, height: h, centerX: (wrapperArea.width + graphAreaSidePadding*wrapperArea.width/100)/2, centerY: h/2};
    var mapping = adjustMappingToArea({mapping:_nodes, area:mappingArea}, graphArea);
    _options['mappingArea'] = graphArea;
    for(var i  in mapping){
      _nodes[i].x = mapping[i].x;
      _nodes[i].y = mapping[i].y;
    }
  }

  /**
   * Draws SVG in wrapper
   * @returns {*|{}|{typeColors}|{typeColors, typeDirection}|{font, fill, maxSize}|{fill}}
   */
  function showGraph(){
    var wrapper = _options['wrapper'];
    var wrapperArea = _options['wrapperArea'];
    var mappingArea = _options['mappingArea'];
    var orig_nodes = _options['orig_nodes'];
    var edges = _options['edges'];
    var nodeContents = _options['nodeContents'];
    var edgeTypes = _options['edgeTypes'];
    var graphAreaSidePadding = _options['graphAreaSidePadding'];
    _nodes = clone(orig_nodes);

    _svgc = wrapper.append("svg")
      .attr("width",  wrapperArea.width+"px")
      .attr("height", wrapperArea.height+"px");

    // add definition for triangle arrow marker for every edge type
    var markerScale = 0.6;
    for(var i in ARROW_EDGE_TYPES){
      var type=ARROW_EDGE_TYPES[i];
      // full-opacity version
      _svgc.append("svg:defs").append("svg:marker")
          .attr("id", "triangle_"+type)
          .attr("refX", 12*markerScale)
          .attr("refY", 6*markerScale)
          .attr("markerWidth", 30*markerScale)
          .attr("markerHeight", 30*markerScale)
          .attr("markerUnits","userSpaceOnUse")
          .attr("orient", "auto")
          .append("path")
          .attr("d", "M 0 0 12 6 0 12 3 6")
          .attr("transform", "scale("+markerScale+")")
          .style("fill", edgeTypes[type].color);

      // and transparent version
      _svgc.append("svg:defs").append("svg:marker")
          .attr("id", "triangle_"+type+"_transparent")
          .attr("refX", 12*markerScale)
          .attr("refY", 6*markerScale)
          .attr("markerWidth", 30*markerScale)
          .attr("markerHeight", 30*markerScale)
          .attr("markerUnits","userSpaceOnUse")
          .attr("orient", "auto")
          .append("path")
          .attr("d", "M 0 0 12 6 0 12 3 6")
          .attr("transform", "scale("+markerScale+")")
          .attr('opacity', 0.1)
          .style("fill", edgeTypes[type].color);
    }

    // append background
    _svgc.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("fill", '#2b2f47')
        .attr("width", wrapperArea.width)
        .attr("height", wrapperArea.height);

    // adjust data to our svg container area
    adjustNodeXY(_nodes, mappingArea, wrapperArea, graphAreaSidePadding);

    // draw edges
    for(var i in edges){
      var edge = _svgc.append("path")
          .attr("id", guid())
          .attr("stroke", edgeTypes[edges[i].type].color)
          .attr("stroke-width", "1")
          .attr("stroke-opacity", "1")
          .style("fill", 'transparent')
          .style("fill-opacity", '0')
          .attr("source", edges[i].source)
          .attr("target", edges[i].target)
          .attr("class", "edges")
          .attr("type", edges[i].type);
      if(ARROW_EDGE_TYPES.indexOf(edges[i].type) !== -1){
        edge.attr("marker-end", "url(#triangle_"+edges[i].type+")");
      }
    }

    // draw nodes
    for(var i in _nodes){
      var node = _nodes[i];
      var circle = _svgc.append("circle")
	        .attr("id", guid())
	        .attr("class", 'graphNode')
          .attr("nodeId", node.id)
          .attr("nodeType", node.type)
          .attr("r", node.size*NODE_SIZE_FACTOR)
          .style("fill", node.color)
          .attr('fill-opacity', node.opacity);
      if (node.type === 'fact') {
          circle
            .style("stroke", '#FFFFFF')
            .style("stroke-width", 1);
      }
    }

    // draw labels
    for(var i in _nodes){
      var node = _nodes[i];

      var active_alternative_id = nodeContents[node.id]['active_alternative_id'];
      addLabel(node, nodeContents[node.id]['alternatives'][active_alternative_id].label, 'default');
    }

    updateNodeXY();

    return _svgc;
  }

  function addLabel(node, str, key){
    var gId = guid();
    var g = _svgc.append('g')
        .attr("class", 'graphLabel')
        .attr("id", gId)
        .attr("key", key)
        .attr("nodeId", node.id)
        .attr("nodeType", node.type)
        .attr("style", "pointer-events: none;");

    var strs = GRASP.html2text(str).split("\n");
    var offset = 0;

    /**
     * IE11 do not like g.append, so we use gNode.appendChild here
     * @type {string}
     */
    var svgNS = "http://www.w3.org/2000/svg";
    var gNode = _document.getElementById(gId);
    for(var j in strs){
      var str = strs[j];
      var newText = _document.createElementNS(svgNS,"text");
      newText.setAttributeNS(null,"class","graphLabelString");
      newText.setAttributeNS(null,"dx",0);
      newText.setAttributeNS(null,"dy",offset);
      newText.setAttributeNS(null,"font-family", LABEL_FONT_FAMILY);
      newText.setAttributeNS(null,"font-size",LABEL_FONT_SIZE_FACTOR*node.size);
      newText.setAttributeNS(null,"fill","#BBBBBB");
      newText.setAttributeNS(null,"opacity",node.opacity);
      var textNode = _document.createTextNode(str);
      newText.appendChild(textNode);
      gNode.appendChild(newText);

      offset += LABEL_FONT_SIZE_FACTOR*node.size;
    }
  }

  /**
   * Return quadratic line starting at start param, ending at stop param.
   * @param start
   * @param stop
   * @return {*}
   * @private
   */
  function getQuadPathData(start, stop, opt_stopOffset){
    var path;

    //perpendicular
    var p = {x:-(stop.y-start.y)/4, y:(stop.x-start.x)/4};
    var middle = {x:(start.x+(stop.x-start.x)/2 + p.x), y:(start.y+(stop.y-start.y)/2 + p.y)};

    // for uni-direction: add offset so that end of line is on circle border
    if(typeof(opt_stopOffset) != 'undefined' && opt_stopOffset>0){
      // get intersection of stop circle and tangent line
      var mv = {x:(middle.x-stop.x), y:(middle.y-stop.y)};
      var mvLength = Math.sqrt(Math.pow(mv.x,2) + Math.pow(mv.y,2));
      mv.x = mv.x/mvLength; mv.y = mv.y/mvLength;
      var cx = stop.x+(opt_stopOffset+0)*mv.x, cy = stop.y+(opt_stopOffset+0)*mv.y;

      // move this intersection 1 pixel in direction of perpendicular to straight line form start circle to stop circle
     // cx = cx - p.x/Math.sqrt((p.x)*(p.x)+(p.y)*(p.y)); cy = cy - p.y/Math.sqrt((p.x)*(p.x)+(p.y)*(p.y));
    }else{
      cx = stop.x;
      cy = stop.y;
    }

    path = "M"+start.x+","+start.y+" Q"+middle.x+","+middle.y+","+cx+","+cy;

    return path;
  }

  function adjustMappingToArea (mapping, area){
    if(typeof(area) == 'undefined') return mapping;

    var i,
        adjustedMappingCoordinates = {},
        xStretchRatio = area.width/mapping.area.width,
        yStretchRatio = area.height/mapping.area.height;

    for(i in  mapping.mapping){
      adjustedMappingCoordinates[i] = {x:null, y:null};
      adjustedMappingCoordinates[i].x = Math.round((mapping.mapping[i].x - mapping.area.centerX)*xStretchRatio) + area.centerX ;
      adjustedMappingCoordinates[i].y = Math.round((mapping.mapping[i].y - mapping.area.centerY)*yStretchRatio) + area.centerY;
    }

    return adjustedMappingCoordinates;
  }

  function guid() {
    return 'g' + s4() + s4() + s4() + s4() +  s4() + s4() + s4() + s4();
  }

  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
  }

  /**
   * This will create clone from Object o (thanks to Rick Waldron)
   * @param o
   * @param forceDescriptor - force every cloned property to have new descriptor - forceDescriptor (so it is possible to unfreeze objects)
   * @return {*} - clone of o
   */
  function clone( obj, forceDescriptor ) {
    if(typeof(obj) === 'undefined' || obj === null) return obj;

    var val, length, i,
        temp = [];
    if ( Array.isArray(obj) ) {
      for ( i = 0, length = obj.length; i < length; i++ ) {
        // Store reference to this array item’s value
        val = obj[ i ];
        // If array item is an object (including arrays), derive new value by cloning
        if ( typeof val === "object" ) {
          val = clone( val, forceDescriptor );
        }
        temp[ i ] = val;
      }
      return temp;
    }
    // Create a new object whose prototype is a new, empty object,
    // Using the second properties object argument to copy the source properties
    return Object.create({}, (function( src ) {
      // Initialize a cache for non-inherited properties
      var props = {};
      Object.getOwnPropertyNames( src ).forEach(function( name ) {
        // Store short reference to property descriptor
        var descriptor = Object.getOwnPropertyDescriptor( src, name );
        // Recursive on properties whose value is an object or array
        if ( typeof src[ name ] === "object" ) {
          descriptor.value = clone( src[ name ], forceDescriptor );
        }
        //if we have properties descriptor to overwrite, use it \
        if(typeof(forceDescriptor) != 'undefined'){
          for(var i in forceDescriptor) descriptor[i] = forceDescriptor[i];
        }
        props[ name ] = descriptor;
      });
      return props;
    }( obj )));
  };
})();

if(typeof module !== 'undefined') module.exports = graphDrawer;
