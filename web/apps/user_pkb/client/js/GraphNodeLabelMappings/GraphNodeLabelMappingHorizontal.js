YOVALUE.GraphNodeLabelMappingHorizontal = function(){
  this.CIRCLE_BOUND_COEFF = 1.3;
};

YOVALUE.GraphNodeLabelMappingHorizontal.prototype = {
  getMapping: function(nodeMapping, nodeLabelAreaList, nodeLabels){
    this._nodeLabelAreaList = nodeLabelAreaList;

    var i, j, labelNewCoordinates = [], nodeMappingCoordinates = nodeMapping.mapping;

    //create array of nodes from layout and nodeLabels
    var nodes = [];
    for(i in nodeMappingCoordinates){
      nodes.push({
        id:nodeMappingCoordinates[i].id,
        x:nodeMappingCoordinates[i].x,
        y:nodeMappingCoordinates[i].y,
        size: nodeLabels[i].size,
        label:nodeLabels[i].label});
    }

    nodes.sort(function(nodeA, nodeB){
      return nodeA.y - nodeB.y;
    });

    for(i in nodes){
      // nodes[i] label must be positioned between these y bounds
      var circleLabelUpperBound = nodes[i].y - this.CIRCLE_BOUND_COEFF*nodes[i].size;
      var circleLabelLowerBound = nodes[i].y + nodes[i].size;

      // first label is positioned at y upper bound
      if(i == 0){
        labelNewCoordinates.push({id:nodes[i].id, x:nodes[i].x, y:circleLabelUpperBound});
        continue;
      }

      //for each pixel from circleLabelUpperBound to circleLabelLowerBound
      //we calculate all intersections size and store it in object intersectionList[intersections size] = pixel
      var intersectionList = {};
      for(j = circleLabelUpperBound; j < circleLabelLowerBound; j++){
        //look for all nodes[i] label intersections
        var intersectionsSum = 0;
        for(var k = labelNewCoordinates.length - 1; k>=0 && labelNewCoordinates[k].y + nodes[k].size >= circleLabelUpperBound; k--){
          var intersectionPretender = nodes[k];
          var intersectionPretenderLabelWidth = this._nodeLabelAreaList[nodes[k].id].width;
          var intersectionPretenderLabelHeight = this._nodeLabelAreaList[nodes[k].id].height;
          var intersection = this._calcRectIntersection(
            {x:nodes[i].x, y:j, width:this._nodeLabelAreaList[nodes[i].id].width, height:this._nodeLabelAreaList[nodes[i].id].height},
            {x:intersectionPretender.x, y:labelNewCoordinates[k].y, width:intersectionPretenderLabelWidth, height:intersectionPretenderLabelHeight}
          );
          intersectionsSum += intersection.x*intersection.y;
        }
        intersectionList[intersectionsSum] = j;
        if(intersectionsSum == 0) break;
      }

      //now get pixel with lowest intersection size and set it as y to new label coordinates
      var keys = Object.keys(intersectionList);
      keys.sort();
      labelNewCoordinates.push({id:nodes[i].id, x:(nodes[i].x), y:intersectionList[keys[0]]});
    }

    var labelNewCoordinatesObj = {};
    for(i in labelNewCoordinates){
      var nodeAngle = this._getNodeAngle(labelNewCoordinates[i].x, labelNewCoordinates[i].y, nodeMapping.area.centerX, nodeMapping.area.centerY);

      //do label layout
      if(nodeAngle >= Math.PI/2 || nodeAngle <= -Math.PI/2) labelNewCoordinates[i].x = nodes[i].x - this._nodeLabelAreaList[labelNewCoordinates[i].id].width;
      labelNewCoordinatesObj[labelNewCoordinates[i].id] = {x:labelNewCoordinates[i].x, y:labelNewCoordinates[i].y, angle:0};
    }
    //create obj that implements iMapping
    var mapping = {
      area: nodeMapping.area,
      mapping:  labelNewCoordinatesObj
    };

    return mapping;
  },

  // r1, r2 = {x, y, width, height}
  _calcRectIntersection: function(r1, r2){
    // helper function that calculates intersection of two 1-dim intervals
    // args: i1={start, stop}, i2={start, stop}
    function calcOneDimIntersection(i1, i2){
      var resections = [];
      resections.push({x:i1.start, interval:0});
      resections.push({x:i1.stop, interval:0});
      resections.push({x:i2.start, interval:1});
      resections.push({x:i2.stop, interval:1});
      resections.sort(function(res1, res2){
        return res1.x - res2.x;
      });
      // if after resection of one interval we see resection of another => two intervals intersects
      if(resections[0].interval != resections[1].interval) return Math.abs(resections[2].x - resections[1].x)
      else return 0;
    }

    var xIntersection = calcOneDimIntersection({start:r1.x, stop:r1.x+r1.width}, {start:r2.x, stop:r2.x+r2.width})
    var yIntersection = calcOneDimIntersection({start:r1.y, stop:r1.y+r1.height}, {start:r2.y, stop:r2.y+r2.height})
    return {x:xIntersection, y:yIntersection}
  },

  _getNodeAngle: function(x, y, centerX, centerY){
    var r = Math.sqrt((x-centerX)*(x-centerX)+(y-centerY)*(y-centerY));
    var q = r>0 ? Math.acos((x-centerX)/r) : 0;
    return (y) > 0 ? q : -q;
  }
};
