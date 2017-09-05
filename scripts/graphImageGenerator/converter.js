var fs = require('fs');
var d3 = require('d3');
var jsdom = require('jsdom');
var graphDrawer = require('/var/www/html/grasp.how/web/apps/frontend/client/js/embed/graph.js');

var arg1 = process.argv[2];
var arg2 = process.argv[3];

var graph = null;
fs.readFile(arg1, (err, data) => {
  if (err) throw err;
  graph = JSON.parse(data);
  graph = graph[Object.keys(graph)[0]]
  outputLocation = arg2+'.svg';

	jsdom.env({
	    html:'',
	    features:{ QuerySelector:true }, //you need query selector for D3 to work
	    done:function(errors, window){
	    	window.d3 = d3.select(window.document); //get d3 into the dom
          var wrapperArea = {width: 1280, height: 960, centerX: 1280/2, centerY: 960/2};

          var wrapper = window.d3.select("body").append("div").attr("id", "mainSVG").attr('style','background: #2C3338;');

          // draw graph SVG in wrapper
          graphDrawer.setD3(d3);
          graphDrawer.setOptions({
              wrapper: wrapper,
              wrapperArea: wrapperArea,
              mappingArea: graph["area"],
              orig_nodes: graph["nodes"],
              edges: graph["edges"],
              nodeContents: graph["nodeContents"],
              nodeTypes: graph["nodeTypes"],
              edgeTypes: graph["edgeTypes"],
              graphAreaSidePadding: 0
          });
          var svg = graphDrawer.showGraph();

          svg.attr({xmlns:'http://www.w3.org/2000/svg'});

          fs.writeFileSync(outputLocation, window.d3.select('#mainSVG').html());
	    }
	});
});
