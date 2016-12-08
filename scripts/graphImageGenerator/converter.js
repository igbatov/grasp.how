var fs = require('fs');
var d3 = require('d3');
var jsdom = require('jsdom');

var arg = process.argv[2];

console.log(arg);

var chartWidth = 500, chartHeight = 500;

var arc = d3.svg.arc()
    .outerRadius(chartWidth/2 - 10)
    .innerRadius(0);

var colours = ['#F00','#000','#000','#000','#000','#000','#000','#000','#000'];

module.exports = function( pieData, outputLocation ){
	if(!pieData) pieData = [12,31];
	if(!outputLocation) outputLocation = 'test.svg';

	jsdom.env({
	    html:'',
	    features:{ QuerySelector:true }, //you need query selector for D3 to work
	    done:function(errors, window){
	    	window.d3 = d3.select(window.document); //get d3 into the dom

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

	    }
	});
}

if (require.main === module) {
    module.exports();
}


