/**
 * Draws SVG given graph nodes, edges, labels
 */
var showGraph = (function(){
  return showGraph;

  /**
   * Draws SVG in wrapper
   * @param wrapper
   * @param wrapperArea
   * @param mappingArea
   * @param orig_nodes
   * @param edges
   * @param nodeContents
   * @param nodeTypes
   * @param edgeTypes
   * @returns {*|{}|{typeColors}|{typeColors, typeDirection}|{font, fill, maxSize}|{fill}}
   */
  function showGraph(wrapper, wrapperArea, mappingArea, orig_nodes, edges, nodeContents, nodeTypes, edgeTypes){
    // CONSTANTS
    var TYPE_NODES_AREA_WIDTH = 15; // in %

    var LABEL_FONT_FAMILY = "sans-serif";
    var LABEL_FONT_SIZE_FACTOR = 0.7;

    var nodes = clone(orig_nodes);

    var svgc = wrapper.append("svg")
      .attr("width",  wrapperArea.width+"px")
      .attr("height", wrapperArea.height+"px");

    // add definition for triangle arrow marker for every edge type
    var markerScale = 0.6;
    for(var type in edgeTypes){
      svgc.append("svg:defs").append("svg:marker")
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
    svgc.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("fill", '#2C3338')
        .attr("width", wrapperArea.width)
        .attr("height", wrapperArea.height);

    // adjust data to our svg container area
    var w = wrapperArea.width - TYPE_NODES_AREA_WIDTH*wrapperArea.width/100;
    var h = wrapperArea.height;
    var graphArea = {width: w, height: h, centerX: w/2 + TYPE_NODES_AREA_WIDTH*wrapperArea.width/100, centerY: h/2};

    var mapping = adjustMappingToArea({mapping:nodes, area:mappingArea}, graphArea);
    for(var i  in mapping){
      nodes[i].x = mapping[i].x;
      nodes[i].y = mapping[i].y;
    }

    // draw type nodes
    var nodeTypeAreaWidth = TYPE_NODES_AREA_WIDTH*wrapperArea.width/100;
    var verticalStep = wrapperArea.height/getObjectLength(nodeTypes);
    var x, y=-verticalStep/2, size;
    for(var i in nodeTypes){
      x = nodeTypeAreaWidth/2;
      size = nodeTypeAreaWidth/12;
      y += verticalStep;
      svgc.append("circle")
          .attr("nodeId", i)
          .attr("nodeType", "nodeType")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", size)
          .style("stroke", nodeTypes[i].color)
          .style("stroke-width", 2)
          .style("fill", nodeTypes[i].color)
          .style("fill-opacity", 0);

      svgc.append("text")
          .attr("nodeId", i)
          .attr("nodeType", "nodeType")
          .attr("style", "pointer-events: none;")
          .attr("dx", x)
          .attr("dy", y + size/2)
          .style("fill", "#BBBBBB")
          .style("fill-opacity", 0.5)
          .style("font-family", LABEL_FONT_FAMILY)
          .style("font-size", LABEL_FONT_SIZE_FACTOR*size)
          .text(nodeTypes[i].label);
    }


    // draw edges
    for(var i in edges){
      var edge = svgc.append("path")
          .attr("d", getQuadPathData(nodes[edges[i].source], nodes[edges[i].target], nodes[edges[i].target].size))
          .attr("stroke", edgeTypes[edges[i].type].color)
          .attr("stroke-width", "1")
          .style("fill", 'transparent')
          .attr("class", "edges");
      if(edges[i].type == 'causal' || edges[i].type == 'conditional'){
        edge.attr("marker-end", "url(#triangle_"+edges[i].type+")");
      }
    }

    // draw nodes
    for(var i in nodes){
      var node = nodes[i];
      svgc.append("circle")
          .attr("nodeId", node.id)
          .attr("nodeType", node.type)
          .attr("cx", node.x)
          .attr("cy", node.y)
          .attr("r", node.size)
          .style("fill", node.color)
          .attr('fill-opacity', node.opacity);
    }

    // draw labels
    for(var i in nodes){
      var node = nodes[i];
//console.log(node.id);
      var active_alternative_id = nodeContents[node.id]['active_alternative_id'];
      var strs = nodeContents[node.id]['alternatives'][active_alternative_id].label.split("\n");
      var offset = 0;
      for(var j in strs){
        var str = strs[j];
        svgc.append("text")
            .attr("nodeId", node.id)
            .attr("nodeType", node.type)
            .attr("style", "pointer-events: none;")
            .attr("dx", node.x)
            .attr("dy", node.y + node.size/2 + offset)
            .style("font-family", LABEL_FONT_FAMILY)
            .style("font-size", LABEL_FONT_SIZE_FACTOR*node.size)
            .style("fill", "#BBBBBB")
            .style("opacity", node.opacity)
            .html(str);
        offset += LABEL_FONT_SIZE_FACTOR*node.size;
      }
    }

    return svgc;
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

  function getObjectLength(obj) {
    var size = 0, key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) size++;
    }
    return size;
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
