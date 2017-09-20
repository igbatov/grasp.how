var DEBUG = false;
var mediator = mediator || new GRASP.Mediator();
var withFbShare = withFbShare || false;

(function($, graphDrawer, actions, nodeContentView, mediator, withFbShare){

  mediator.setSubscriptions({
    'hide_all_labels':[graphDrawer],
    'show_nodes':[graphDrawer],
    'add_labels':[graphDrawer],
    'remove_labels':[graphDrawer],
    'change_options':[graphDrawer],
    'highlight_nodes':[graphDrawer],
    'highlight_edges':[graphDrawer],
    'remove_highlights':[graphDrawer],
    'show_all_labels':[graphDrawer]
  });

  $( document ).ready(function(){

    // example
    /*
     var area = {width:300, height:250, centerX:150, centerY: 125};
     var nodeTypes = {fact:{label:"Факт", color:"purple"}, hypothesis:{label:"Гипотеза", color:"red"}};
     var nodes = {1:{id:1, x:0, y:25, color:"purple", type:"fact", size:25, opacity: 1}, 2:{id:2, x:125, y:225, color:"red", type:"hypothesis", size:20, opacity: 0.8}};
     var edgeTypes = {causal:{color:"purple"}, conditional:{color:"red"}, link:{color:"red"}};
     var edges = {1:{id:1, source:1, target:2}};
     var nodeContents = {0:{active_alternative_id:,alternatives:{},has_icon:,importance:,stickers:,type:}, ...}};
     var node_id_global_content_id_map = {0:"123-1"}
     var graphs = {
       1: {name:"Name1", area:area, nodes:nodes, edges:edges, nodeContents:nodeContents, nodeTypes:nodeTypes,edgeTypes:edgeTypes.node_id_global_content_id_map:node_id_global_content_id_map},
       2: {name:"Name2", area:area, nodes:nodes, edges:edges, nodeContents:nodeContents, nodeTypes:nodeTypes.edgeTypes:edgeTypes,node_id_global_content_id_map:node_id_global_content_id_map}
     };
     */
    var graphs = $("#graphsData").text() != "" ? JSON.parse(GRASP.htmlspecialchars_decode($("#graphsData").text())) : null;

    showGraphMenu(graphs);
  });

  /**
   * Draws graph
   * @param graphId
   * @param graph
   */
  function showMenuItem(graphId, graph){
    // select menu item
    $('.graphMenuItem a').removeClass('active');
    $("#graphMenuItem"+graphId+' a').addClass('active');

    // remove old svg if any
    $("#mainSVG").remove();

    var wrapper = createWrapper();

    // Lets use only global node ids
    graph = convertIdsToGlobal(graph);

    // draw graph SVG in wrapper
    graphDrawer.setD3(d3);
    graphDrawer.setOptions({
      wrapper: wrapper.div,
      wrapperArea: wrapper.dims,
      mappingArea: graph["area"],
      orig_nodes: graph["nodes"],
      edges: graph["edges"],
      nodeContents: graph["nodeContents"],
      nodeTypes: graph["nodeTypes"],
      edgeTypes: graph["edgeTypes"],
      graphAreaSidePadding: 0
    });
    graphDrawer.showGraph();

    // create text boxes
    var condPInfo = getCondPsInfo(graph["nodeContents"], graph["edges"]);
    graphActions.addActions(graph["nodes"], graph["nodeContents"], condPInfo, nodeContentView);
  }

  /**
   * Convert node ids to global node ids
   * @param graphs
   */
  function convertIdsToGlobal(graph){
    var nodes = {}, edges={}, nodeContents={}, globalId;
    for(var i in graph["nodes"]){
      globalId = graph["node_id_global_content_id_map"][graph["nodes"][i].id];
      nodes[globalId] = graph["nodes"][i];
      nodes[globalId].id = globalId;
    }

    for(var i in graph["edges"]){
      edges[i] = graph["edges"][i];
      edges[i].source = graph["node_id_global_content_id_map"][edges[i].source];
      edges[i].target = graph["node_id_global_content_id_map"][edges[i].target];
    }

    for(var i in graph["nodeContents"]){
      globalId = graph["node_id_global_content_id_map"][i];
      nodeContents[globalId] = graph["nodeContents"][i];
    }

    return {
      name:graph['name'],
      area:graph['area'],
      nodeTypes:graph['nodeTypes'],
      edgeTypes:graph['edgeTypes'],
      nodes:nodes,
      edges:edges,
      nodeContents:nodeContents
    };
  }

  /**
   * Draws graph tabs (if Object.keys(graphs).length>1)
   * and show first graph from graph
   * @param graphs
   */
  function showGraphMenu(graphs){
    if(!graphs) return;

    // create menu items
    if(Object.keys(graphs).length>1){
      // create li in menu
      for(var i in graphs){
        $("#graphMenu").append("<li id='graphMenuItem"+i+"' graphId='"+i+"' class='graphMenuItem'><a href='#'>"+graphs[i]["name"]+"</a></li>");
      }
      // create ribbon link
      $("#graphMenu").on('click', function(e){
        document.getElementById('clone-ribbon').href = 'http://my.grasp.how/cloneGraph?data={"graph_id":"'+e.target.parentElement.getAttribute('graphId')+'"}';
      });
    }

    // add menu onclick event handler
    $(".graphMenuItem").click(function(e){
      var graphId = $(this).attr("graphId");
      showMenuItem(graphId, graphs[graphId]);
    });

    // show first graph
    var graphId = Object.keys(graphs)[0];
    showMenuItem(graphId, graphs[graphId]);
  }

  function createWrapper(){
    var GRAPH_CONTAINER_LEFT_WIDTH_MARGIN = 0; // in %
    var GRAPH_CONTAINER_RIGHT_WIDTH_MARGIN = 0; // in %
    var GRAPH_CONTAINER_BOTTOM_MARGIN = withFbShare ? 25 : 0; // in px

    var svgcH = $(window).height();
    svgcH -= GRAPH_CONTAINER_BOTTOM_MARGIN;
    svgcH -= $('#mainMenu').outerHeight(true); // get height of menu with margins
    var wrapper = d3.select("#graphContainer").append("div")
        .attr("id", "mainSVG")
        .attr("style", "margin-left: "+GRAPH_CONTAINER_LEFT_WIDTH_MARGIN+"%;"+
            " margin-right: "+GRAPH_CONTAINER_RIGHT_WIDTH_MARGIN+"%;"+
            " overflow: hidden;"+
            " height:"+svgcH+'px;'+
            ' width:'+(100-2*(GRAPH_CONTAINER_LEFT_WIDTH_MARGIN+GRAPH_CONTAINER_RIGHT_WIDTH_MARGIN))+"%"
        );
    var wrapperDims = {width: $('#mainSVG').width(), height: $('#mainSVG').height(), centerX: $('#mainSVG').width()/2, centerY: $('#mainSVG').height()/2};
    return {div:wrapper, dims:wrapperDims}
  }

  /**
   * Convert conditional probabilities onto human-readable text
   * @param contents - array of node contents
   * @param edges
   * @returns {{}}
   */
  function getCondPsInfo(contents, edges){
    var condPInfo = {}; // key - nodeId, value - text or null

    for(var nodeId in contents){
      var parentContents = {};
      var parentIds = getParentIds(nodeId, edges);
      for(var j in parentIds){
        var parentId = parentIds[j];
        parentContents[parentId] = contents[parentId];
      }

      if(GRASP.nodeConditionalFormHelper.isNodeConditionalFieldsEmpty(contents[nodeId])){
        condPInfo[nodeId] = null;
        continue;
      }

      // decipher conditional probabilities into text
      condPInfo[nodeId] = GRASP.nodeConditionalFormHelper.getNodeConditionalFormFields(
          contents[nodeId],
          false,
          function(type){return type == 'fact'},
          parentContents,
          ['fact', 'proposition'],
          nodeId
      );
    }
    return condPInfo;

    function getParentIds(nodeId, edges){
      var parentIds = [];
      for(var i in edges){
        var e = edges[i];
        if(nodeId == e.target){
          parentIds.push(e.source);
        }
      }
      return parentIds;
    }
  }

})($, graphDrawer, graphActions, nodeContentView, mediator, withFbShare);

