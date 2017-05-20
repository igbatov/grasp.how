
/**
 * Draws SVG given graph nodes, edges, labels
 */
var graphDrawer = (function(){
  // CONSTANTS
  var LABEL_FONT_FAMILY = "sans-serif";
  var LABEL_FONT_SIZE_FACTOR = 1.6;
  var NODE_SIZE_FACTOR = 1.6;

  // private module vars
  var _svgc;
  var _nodes;
  var _options;

  return {
    setOptions: setOptions,
    eventListener: eventListener,
    showGraph: showGraph,
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

  function eventListener(e){
    var eventName = e.getName();
    var eventData = e.getData();
    if(eventName == 'hide_all_labels'){
      d3.selectAll('.graphLabel').style("visibility", "hidden");

    }else if(eventName == 'show_all_labels'){
      d3.selectAll('.graphLabel').style("visibility", "visible");

    }else if(eventName == 'add_labels'){
      for(var i in eventData){
        addLabel(_nodes[eventData[i].nodeId], eventData[i].label, eventData[i].key)
      }
      updateNodeXY();

    }else if(eventName == 'remove_labels'){
      for(var i in eventData){
        d3.selectAll('[key = "'+eventData[i]+'"]').remove();
      }
      updateNodeXY();

    }else if(eventName == 'pick_out_nodes'){
      var pickOutNodes = eventData['nodeIds'];
      d3.selectAll('circle').filter(function (x) {
        return pickOutNodes.indexOf(d3.select(this).attr('nodeId')) === -1;
      }).attr('fill-opacity', 0.1);
      d3.selectAll('.graphLabel').filter(function (x) {
        return pickOutNodes.indexOf(d3.select(this).attr('nodeId'))
      }).attr('fill-opacity', 0.1);
      d3.selectAll('path').attr('stroke-opacity', 0.1);
      d3.selectAll('marker').attr('fill-opacity', 0.1);

    }else if(eventName == 'remove_pick_outs'){
      // nodes
      var nodes = _options['orig_nodes'];
      var circles = d3.selectAll('circle')[0];
      for(var i in circles){
        var circle = circles[i];
        var nodeId = d3.select(circle).attr('nodeId');
        if(nodeId && nodes[nodeId]) d3.select(circle).attr('fill-opacity', nodes[nodeId].opacity);
      }

      // edges
      d3.selectAll('path').attr('stroke-opacity', 1);
      d3.selectAll('marker').attr('fill-opacity', 1);

      // labels
      d3.selectAll('.graphLabel').attr('fill-opacity', 1);

    }else if(eventName == 'change_options'){
      for(var option in eventData) {
        _options[option] = eventData[option];
        if(option === 'graphAreaSidePadding') {
          // update mapping
          adjustNodeXY(_nodes, _options['wrapperArea'], _options['mappingArea'], _options['graphAreaSidePadding']);
          updateNodeXY();
        }
      }
    }
  }

  function updateNodeXY(){
    // update nodes
    var circles = d3.selectAll('circle')[0];
    for(var i in circles){
      var circle = circles[i];
      var nodeId = d3.select(circle).attr('nodeId');
      if(nodeId && _nodes[nodeId]) {
        // update nodes
        var node = _nodes[nodeId];
        d3.select(circle)
            .attr('cx', node.x)
            .attr('cy', node.y);
      }
    }

    // update labels
    var labels = d3.selectAll('.graphLabel')[0];
    for(var i in labels){
      var label = d3.select(labels[i]);
      var nodeId = label.attr('nodeId');
      if(nodeId && _nodes[nodeId]) {
        var node = _nodes[nodeId];
        label.attr('transform', "translate(" + node.x + "," + node.y + ")");
      }
    }

    // update edges
    var edges = d3.selectAll('path')[0];
    for(var i in edges) {
      var edge = d3.select(edges[i]);
      var source = edge.attr('source');
      var target = edge.attr('target');
      if(source && target && _nodes[source] && _nodes[source]) {
        edge.attr("d", getQuadPathData(_nodes[source], _nodes[target], _nodes[target].size*NODE_SIZE_FACTOR));
      }
    }
  }

  function adjustNodeXY(_nodes, wrapperArea, mappingArea, graphAreaSidePadding){
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
    for(var type in edgeTypes){
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
    }

    // append background
    _svgc.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("fill", '#2b2f47')
        .attr("width", wrapperArea.width)
        .attr("height", wrapperArea.height);

    // adjust data to our svg container area
    adjustNodeXY(_nodes, wrapperArea, mappingArea, graphAreaSidePadding);

    // draw edges
    for(var i in edges){
      var edge = _svgc.append("path")
          .attr("stroke", edgeTypes[edges[i].type].color)
          .attr("stroke-width", "1")
          .attr("stroke-opacity", "1")
          .style("fill", 'transparent')
          .style("fill-opacity", '0')
          .attr("source", edges[i].source)
          .attr("target", edges[i].target)
          .attr("class", "edges");
      if(edges[i].type == 'causal' || edges[i].type == 'conditional'){
        edge.attr("marker-end", "url(#triangle_"+edges[i].type+")");
      }
    }

    // draw nodes
    for(var i in _nodes){
      var node = _nodes[i];
      _svgc.append("circle")
          .attr("class", 'graphNode')
          .attr("nodeId", node.id)
          .attr("nodeType", node.type)
          .attr("r", node.size*NODE_SIZE_FACTOR)
          .style("fill", node.color)
          .attr('fill-opacity', node.opacity);
    }

    // draw labels
    for(var i in _nodes){
      var node = _nodes[i];

      var active_alternative_id = nodeContents[node.id]['active_alternative_id'];
      addLabel(node, nodeContents[node.id]['alternatives'][active_alternative_id].label);
    }

    updateNodeXY();

    return _svgc;
  }

  function addLabel(node, str, key){
    var g = _svgc.append('g')
        .attr("class", 'graphLabel')
        .attr("key", key)
        .attr("nodeId", node.id)
        .attr("nodeType", node.type)
        .attr("style", "pointer-events: none;");

    var strs = str.split("\n");
    var offset = 0;
    for(var j in strs){
      var str = strs[j];
      g.append("text")
          .attr("class", 'graphLabelString')
          .attr("dx", 0)
          .attr("dy", offset)
          .style("font-family", LABEL_FONT_FAMILY)
          .style("font-size", LABEL_FONT_SIZE_FACTOR*node.size)
          .style("fill", "#BBBBBB")
          .style("opacity", node.opacity)
          .html(str);
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
