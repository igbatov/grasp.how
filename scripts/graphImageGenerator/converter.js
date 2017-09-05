var fs = require('fs');
var d3 = require('d3');
var jsdom = require('jsdom');
var graphDrawer = require('/var/www/html/grasp.how/web/apps/frontend/client/js/embed/graph.js');
//filedata = fs.readFileSync('../../web/apps/frontend/client/js/graph.js','utf8');
//filedata = fs.readFileSync('/var/www/html/grasp.how/web/apps/frontend/client/js/embed/graph.js','utf8')+"";
//console.log(filedata);
//eval(filedata);

var arg1 = process.argv[2];
var arg2 = process.argv[3];

var graph = null;
fs.readFile(arg1, (err, data) => {
  if (err) throw err;
  graph = JSON.parse(data);
  graph = graph[Object.keys(graph)[0]]
  console.log(graph);


//console.log(arg);

        outputLocation = arg2+'.svg';

	jsdom.env({
	    html:'',
	    features:{ QuerySelector:true }, //you need query selector for D3 to work
	    done:function(errors, window){
	    	window.d3 = d3.select(window.document); //get d3 into the dom
                var wrapperArea = {width: 1280, height: 960, centerX: 1280/2, centerY: 960/2};

                var wrapper = window.d3.select("body").append("div").attr("id", "mainSVG").attr('style','background: #2C3338;');

                // draw graph SVG in wrapper
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
 /*
                //do yr normal d3 stuff
	    	var svg = window.d3.select('body')
	    		.append('div').attr('class','container') //make a container div to ease the saving process
	    		.append('svg')
	    			.attr({
			      		xmlns:'http://www.w3.org/2000/svg',
			      		width:chartWidth,
			      		height:chartHeight
			      	})
			    .append('g')
			    	.attr('transform','translate(' + chartWidth/2 + ',' + chartWidth/2 + ')');

	    	svg.selectAll('.arc')
	    		.data( d3.layout.pie()(pieData) )
	    			.enter()
	    		.append('path')
	    			.attr({
	    				'class':'arc',
	    				'd':arc,
	    				'fill':function(d,i){
	    					return colours[i];
	    				},
	    				'stroke':'#fff'
	    			});

	    	//write out the children of the container div
    		fs.writeFileSync(outputLocation, window.d3.select('.container').html()) //using sync to keep the code simple
*/
	    }
	});
});
