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

    function showGraphMenu(graphs){
      if(!graphs) return;
      // create menu items
      if(Object.keys(graphs).length>1){
        for(var i in graphs){
          $("#graphMenu").append("<li id='graphMenuItem"+i+"' graphId='"+i+"' class='graphMenuItem'><a href='#'>"+graphs[i]["name"]+"</a></li>");
        }
        $("#graphMenu").on('click', function(e){
          document.getElementById('clone-ribbon').href = 'http://my.grasp.how/cloneGraph?data={"graph_id":"'+e.target.parentElement.getAttribute('graphId')+'"}';
        });
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
        var svg = showGraph(graph["area"], graph["nodes"], graph["edges"], graph["nodeContents"], graph["nodeTypes"]);
        //  console.log(svg[0][0].outerHTML);
      }
    }
  });
})($);

