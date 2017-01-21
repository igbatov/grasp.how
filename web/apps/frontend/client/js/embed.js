(function($){
  $( document ).ready(function(){

    // example graphs
    /*
     var area = {width:300, height:250, centerX:150, centerY: 125};
     var nodes = {1:{id:1, x:0, y:25, color:"purple", type:"fact", size:25, opacity: 1}, 2:{id:2, x:125, y:225, color:"red", type:"hypothesis", size:20, opacity: 0.8}};
     var edges = {1:{id:1, source:1, target:2}};
     var nodeContents = {1:{label:"История и Хайдте", text:"Длинная История о Хайдте"}, 2:{label:"Доказательство бытия", text:"Длтнное Доказательство бытия"}};
     var nodeTypes = {fact:{label:"Факт", color:"purple"}, hypothesis:{label:"Гипотеза", color:"red"}};
     var exampleGraphs = {
     1: {name:"Пример", area:area, nodes:nodes, edges:edges, nodeContents:nodeContents, nodeTypes:nodeTypes},
     2: {name:"Пример", area:area, nodes:nodes, edges:edges, nodeContents:nodeContents, nodeTypes:nodeTypes}
     };
     */
    var graphs = $("#graphsData").text() != "" ? JSON.parse($("#graphsData").text()) : null;

    showGraphMenu(graphs);
  });

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

  function showMenuItem(graphId, graph){
    // select menu item
    $('.graphMenuItem a').removeClass('active');
    $("#graphMenuItem"+graphId+' a').addClass('active');

    // ------- show graph ----------
    var GRAPH_CONTAINER_LEFT_WIDTH_MARGIN = 1; // in %
    var GRAPH_CONTAINER_RIGHT_WIDTH_MARGIN = 2; // in %
    var GRAPH_CONTAINER_BOTTOM_MARGIN = 12; // in %

    // remove old svg id any
    $("#mainSVG").remove();

    // create svg wrapper
    var svgcH = $(window).height();
    svgcH -= GRAPH_CONTAINER_BOTTOM_MARGIN*svgcH/100;
    svgcH -= $('#mainMenu').outerHeight(true); // get height of menu with margins
    var wrapper = d3.select("#graphContainer").append("div")
      .attr("id", "mainSVG")
      .attr("style", "margin-left: "+GRAPH_CONTAINER_LEFT_WIDTH_MARGIN+"%;"+
      " margin-right: "+GRAPH_CONTAINER_RIGHT_WIDTH_MARGIN+"%;"+
      " height:"+svgcH+'px;'+
      ' width:'+(100-2*(GRAPH_CONTAINER_LEFT_WIDTH_MARGIN+GRAPH_CONTAINER_RIGHT_WIDTH_MARGIN))+"%"
    );
    var wrapperArea = {width: $('#mainSVG').width(), height: $('#mainSVG').height(), centerX: $('#mainSVG').width()/2, centerY: $('#mainSVG').height()/2};

    // draw graph SVG in wrapper
    var svg = showGraph(wrapper, wrapperArea, graph["area"], graph["nodes"], graph["edges"], graph["nodeContents"], graph["nodeTypes"], graph["edgeTypes"]);
    //console.log(svg[0][0].outerHTML);

    var condPInfo = getCondPsInfo(graph["nodeContents"], graph["edges"], graph["node_id_global_content_id_map"]);

    // create text boxes
    addGraphActions(graph["nodes"], graph["nodeContents"], condPInfo);
  }

  function getCondPsInfo(contents, edges, node_id_global_content_id_map){
    var condPInfo = {}; // key - nodeId, value - text or null
    for(var i in contents){
      var parentContents = {};
      var parentIds = getParentIds(i, edges);
      for(var j in parentIds){
        var parentId = parentIds[j];
        parentContents[node_id_global_content_id_map[parentId]] = contents[parentId];
      }

      if(GRASP.nodeConditionalFormHelper.isNodeConditionalFieldsEmpty(contents[i])){
        condPInfo[i] = null;
        continue;
      }

      // decipher conditional probabilities into text
      var f = GRASP.nodeConditionalFormHelper.getNodeConditionalFormFields(
          contents[i],
          false,
          function(type){return type == 'fact'},
          parentContents,
          ['fact', 'proposition']
      );

      // create decorated text string for each f.fields[i]
      condPInfo[i] = '';
      for(var j in f.fields){
        if(f.fields[j].type != 'hidden'){
          if(j.includes("label")){
            if(j.includes("_IF_label")) condPInfo[i] += '\n'+f.fields[j].value + "\n";
            else condPInfo[i] += f.fields[j].value + "\n";
          }
          if(!j.includes("label")){
            // remove previous "\n"
            condPInfo[i] = condPInfo[i].substr(0, condPInfo[i].length-2);
            condPInfo[i] += '<b> - IS '+f.fields[j].value + "</b>\n";
          }
        }
      }
    }
    return condPInfo;
  }

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

})($);

