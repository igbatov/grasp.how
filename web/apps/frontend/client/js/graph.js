$( document ).ready(function(){

  // example data

  var area = {width:300, height:250, centerX:150, centerY: 125};
  var nodes = {1:{id:1, x:0, y:25, color:"purple", type:"fact", size:25, opacity: 1}, 2:{id:2, x:125, y:225, color:"red", type:"hypothesis", size:20, opacity: 0.8}};
  var edges = {1:{id:1, source:1, target:2}};
  var nodeContents = {1:{label:"История и Хайдте", text:"Длинная История о Хайдте"}, 2:{label:"Доказательство бытия", text:"Длтнное Доказательство бытия"}};
  var nodeTypes = {fact:{label:"Факт", color:"purple"}, hypothesis:{label:"Гипотеза", color:"red"}};
  var exampleGraphs = {
    1: {name:"Пример", area:area, nodes:nodes, edges:edges, nodeContents:nodeContents, nodeTypes:nodeTypes},
    2: {name:"Пример", area:area, nodes:nodes, edges:edges, nodeContents:nodeContents, nodeTypes:nodeTypes}
  };

  // real data
  var graphs = $("#graphsData").text() != "" ? JSON.parse($("#graphsData").text()) : exampleGraphs;

  showGraphMenu(graphs);

  function showGraphMenu(graphs){
    // create menu items
    for(var i in graphs){
      $("#graphMenu").append("<li id='graphMenuItem"+i+"' graphId='"+i+"' class='graphMenuItem'><a href='#'>"+graphs[i]["name"]+"</a></li>");
    }

    // add onclick event handler
    $(".graphMenuItem").click(function(e){
      showMenuItem($(this).attr("graphId"));
    });

    // show first graph
    showMenuItem(Object.keys(graphs)[0]);

    function showMenuItem(graphId){
      var graph = graphs[graphId];

      // select menu item
      $('.graphMenuItem a').removeClass('active');
      $("#graphMenuItem"+graphId+' a').addClass('active');

      // show graph
      showGraph(graph["area"], graph["nodes"], graph["edges"], graph["nodeContents"], graph["nodeTypes"]);
    }
  }

  function showGraph(area, orig_nodes, edges, nodeContents, nodeTypes){
    // CONSTANTS
    var GRAPH_CONTAINER_LEFT_WIDTH_MARGIN = 1; // in %
    var GRAPH_CONTAINER_RIGHT_WIDTH_MARGIN = 2; // in %
    var GRAPH_CONTAINER_BOTTOM_MARGIN = 30; // in %
    var TEXT_BOX_WIDTH_CENTER_MARGIN = 20; // in %
    var TEXT_BOX_WIDTH_BORDER_MARGIN = 5; // in %
    var TEXT_BOX_WIDTH_BOTTOM_MARGIN = 5; // in %
    var TYPE_NODES_AREA_WIDTH = 15; // in %

    var LABEL_FONT_FAMILY = "sans-serif";
    var LABEL_FONT_SIZE_FACTOR = 0.7;

    // this will be changed by code (adjustNodeMapping), so clone it here
    var nodes = clone(orig_nodes);

    // remove old svg id any
    $("#mainSVG").remove();

    // create new new svg container
    var svgcH = $(window).height();
    svgcH -= GRAPH_CONTAINER_BOTTOM_MARGIN*svgcH/100;
    svgcH -= $('#mainMenu').outerHeight(true); // get height of menu with margins
    var svgc = d3.select("#graphContainer").append("svg")
      .attr("id", "mainSVG")
      .attr("width", (100-2*(GRAPH_CONTAINER_LEFT_WIDTH_MARGIN+GRAPH_CONTAINER_RIGHT_WIDTH_MARGIN))+"%")
      .attr("style", "margin-left: "+GRAPH_CONTAINER_LEFT_WIDTH_MARGIN+"%; margin-right: "+GRAPH_CONTAINER_RIGHT_WIDTH_MARGIN+"%;")
      .attr("height", svgcH);

    // create div (textBox) where node content will be shown
    var offset = $("#graphContainer").offset();
    var graphContainerWidth = $("#graphContainer").width();
    var graphContainerHeight = $("#graphContainer").height();
    var pos = {
      top:offset.top,
      left:offset.left + TEXT_BOX_WIDTH_BORDER_MARGIN*(graphContainerWidth/2)/100,
      width:graphContainerWidth/2 - TEXT_BOX_WIDTH_CENTER_MARGIN*(graphContainerWidth/2)/100,
      height:graphContainerHeight - TEXT_BOX_WIDTH_BOTTOM_MARGIN*graphContainerHeight/100
    };
    $('body').append('<div id="leftTextBox" class="textBox" style="display:none; position: absolute; top: '+pos.top+'px; left: '+pos.left+'px; width: '+pos.width+'px; height: '+pos.height+'px"></div>');
    var pos = {
      top:offset.top,
      left:offset.left + graphContainerWidth/2 + (TEXT_BOX_WIDTH_CENTER_MARGIN - TEXT_BOX_WIDTH_BORDER_MARGIN)*(graphContainerWidth/2)/100,
      width:graphContainerWidth/2 - TEXT_BOX_WIDTH_CENTER_MARGIN*(graphContainerWidth/2)/100,
      height:graphContainerHeight - TEXT_BOX_WIDTH_BOTTOM_MARGIN*graphContainerHeight/100
    };
    $('body').append('<div id="rightTextBox" class="textBox" style="display:none; position: absolute; top: '+pos.top+'px; left: '+pos.left+'px; width: '+pos.width+'px; height: '+pos.height+'px"></div>');

    // global variable for current selected (clicked) node
    var selectedNodeId = null;

    // unset selectedNodeId when clicked somewhere
    $(document).click(function(e){
      if(e.target.id == 'leftTextBox' || e.target.id == 'rightTextBox') return;
      selectedNodeId = null;
      restoreOpacity(nodes);
    });

    // adjust data to our svg container area
    var svgArea = {width: $('svg').width(), height: $('svg').height(), centerX: $('svg').width()/2, centerY: $('svg').height()/2};
    var w = svgArea.width - TYPE_NODES_AREA_WIDTH*svgArea.width/100;
    var h = svgArea.height;
    var graphArea = {width: w, height: h, centerX: w/2 + TYPE_NODES_AREA_WIDTH*svgArea.width/100, centerY: h/2};

    var mapping = adjustMappingToArea({mapping:nodes, area:area}, graphArea);
    for(var i  in mapping){
      nodes[i].x = mapping[i].x;
      nodes[i].y = mapping[i].y;
    }

    // draw type nodes
    var nodeTypeAreaWidth = TYPE_NODES_AREA_WIDTH*svgArea.width/100;
    var verticalStep = svgArea.height/getObjectLength(nodeTypes);
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
        .style("fill-opacity", 0)
        .on("mouseover", function(){
            if(selectedNodeId !== null) return;
            hideAllTypesExcept(d3.select(this).attr('nodeId'));
        })
        .on("click", function(){
            if(selectedNodeId != null) return;
            selectedNodeId = d3.select(this).attr('nodeId');
            hideAllTypesExcept(d3.select(this).attr('nodeId'));
            // stop propagation
            d3.event.stopPropagation();
        })
        .on("mouseout", function(){
          if(selectedNodeId !== null) return;
          restoreOpacity(nodes);
        });

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
      svgc.append("path")
        .attr("d", getQuadPathData(nodes[edges[i].source], nodes[edges[i].target], 1)).style("fill", 'grey').attr("class", "edges");
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
        .attr('fill-opacity', node.opacity)
        .on("mouseover", function(){
          if(selectedNodeId !== null) return;

          // hide all other nodes
          var selfNodeId = d3.select(this).attr('nodeId');
          d3.selectAll('circle').filter(function (x) { return selfNodeId != d3.select(this).attr('nodeId') && d3.select(this).attr('nodeType') != 'nodeType'; }).attr('fill-opacity', 0.2);
          d3.selectAll('text').filter(function (x) { return selfNodeId != d3.select(this).attr('nodeId') && d3.select(this).attr('nodeType') != 'nodeType'; }).attr('fill-opacity', 0.2);
          d3.selectAll('path').attr('fill-opacity', 0.2);

          // show text box with node content
          var circle = d3.select(this);
          var nodeText = nodeContents[selfNodeId].text;
          showTextBox(circle, nodeText);
        })
        .on("mouseout", function(){
          if(selectedNodeId !== null) return;
          restoreOpacity(nodes);
        })
        .on("click", function() {
          if(selectedNodeId != null) return;
          selectedNodeId = d3.select(this).attr('nodeId');

          // show text box with node content
          var circle = d3.select(this);
          var nodeText = nodeContents[selectedNodeId].text;
          showTextBox(circle, nodeText);

          // stop propagation
          d3.event.stopPropagation();
        });
    }

    // draw labels
    for(var i in nodes){
      var node = nodes[i];

      var strs = nodeContents[node.id].label.split("\n");
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
  }

  function hideAllTypesExcept(type){
    d3.selectAll('circle').filter(function (x) { return type != d3.select(this).attr('nodeType') && d3.select(this).attr('nodeType') != 'nodeType'; }).attr('fill-opacity', 0.2);
    d3.selectAll('text').filter(function (x) { return type != d3.select(this).attr('nodeType') && d3.select(this).attr('nodeType') != 'nodeType'; }).attr('fill-opacity', 0.2);
    d3.selectAll('path').attr('fill-opacity', 0.2);
  }

  function showTextBox(circle, nodeText){
    // determine where node is - on the left part on on the right
    var w = $("#graphContainer").width();
    var textBoxId;

    if(circle.attr('cx') > w/2) textBoxId = 'leftTextBox';
    else  textBoxId = 'rightTextBox';

    // set node content to textBox and show it
    $('#'+textBoxId).html(nodeText.replace(/(?:\r\n|\r|\n)/g, '<br />'));
    $('#'+textBoxId).show();
  }

  function restoreOpacity(nodes){
    // nodes
    var circles = d3.selectAll('circle')[0];
    for(var i in circles){
      var circle = circles[i];
      var nodeId = d3.select(circle).attr('nodeId');
      var nodeType = d3.select(circle).attr('nodeType');
      if(nodeId && nodes[nodeId] && nodeType != "nodeType") d3.select(circle).attr('fill-opacity', nodes[nodeId].opacity);
    }

    // edges
    d3.selectAll('path').attr('fill-opacity', 1);

    // labels
    d3.selectAll('text').filter(function (x) { return d3.select(this).attr('nodeType') != 'nodeType'; }).attr('fill-opacity', 1);

    // hide all textBoxes
    $('.textBox').hide();
  }

  /**
   * Return area that is bordered by quadratic line starting at start param, ending at stop param.
   * @param start
   * @param stop
   * @param {number=} opt_width - width of the area in pixels, default is no width
   * @return {*}
   * @private
   */
  function getQuadPathData(start, stop, opt_width){
    var path;

    //perpendicular
    var p = {x:-(stop.y-start.y)/4, y:(stop.x-start.x)/4};
    var middle = {x:(start.x+(stop.x-start.x)/2 + p.x), y:(start.y+(stop.y-start.y)/2 + p.y)};

    if(opt_width){
      var norm = 2*Math.sqrt((p.x)*(p.x)+(p.y)*(p.y))/opt_width;

      //bottom start
      var bs = {x:Math.round(start.x-p.x/norm), y:Math.round(start.y-p.y/norm)};
      //bottom middle
      var bm = {x:Math.round(middle.x-p.x/norm), y:Math.round(middle.y-p.y/norm)};
      //bottom end
      var be = {x:Math.round(stop.x-p.x/norm), y:Math.round(stop.y-p.y/norm)};

      //up start
      var us = {x:Math.round(stop.x+p.x/norm), y:Math.round(stop.y+p.y/norm)};
      //up middle
      var um = {x:Math.round(middle.x+p.x/norm), y:Math.round(middle.y+p.y/norm)};
      //up end
      var ue = {x:Math.round(start.x+p.x/norm), y:Math.round(start.y+p.y/norm)};

      path = "M"+bs.x+","+bs.y+" Q"+bm.x+","+bm.y+","+be.x+","+be.y+" L"+us.x+","+us.y+" Q"+um.x+","+um.y+","+ue.x+","+ue.y+"Z";
    }else{
      path = "M"+start.x+","+start.y+" Q"+middle.x+","+middle.y+","+stop.x+","+stop.y;
    }

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

});
