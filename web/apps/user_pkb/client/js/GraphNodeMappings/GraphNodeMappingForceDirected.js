/**
 * This module generate mapping of nodes using force directed layout
 * http://en.wikipedia.org/wiki/Force-based_algorithms
 * Algorithm was adopted from http://dhotson.github.io/springy.html
 * NB: the area of the mapping is always the {centerX: 0, centerY:0, width: this.SCALE_FACTOR, height: this.SCALE_FACTOR}
 */
GRASP.GraphNodeMappingForceDirected = function(){
  this.area = {centerX:0, centerY:0, width:0, height:0};
  this.points = {};
  this.springs = [];
};

GRASP.GraphNodeMappingForceDirected.prototype = {
  /**
   *
   * @param nodes
   * @param edges
   * @param hint - mapping that can be used as initial mapping
   * @param nodeLabelAreaList - array of label dimensions
   * @param area - area dimensions for the mapping
   * @returns {{area: *, mapping: *}}
   */
  getMapping: function(nodes, edges, hint, nodeLabelAreaList, area){
    this.points = {};
    this.springs = [];
    this.area = area;
    var hintMapping;

    if(hint){
      hint.mapping = GRASP.arrayToObject(hint.mapping);
      hintMapping = GRASP.clone(hint);
    }

    // adjust hint to area we need to map to
    if(hintMapping && !GRASP.deepCompare(hintMapping.area, area)) hintMapping = GRASP.MappingHelper.adjustMappingToArea(hintMapping, area);

    // If for some nodes we already have fixed coordinates that should not be changed (hint mapping)
    // then place all the rest unmapped node in random place around its random adjacent node
    if(hintMapping){
      var radius = area.height/10;

      // map nodes that are not mapped
      for(var i in nodes){
        if(typeof(hintMapping.mapping[nodes[i].id]) == 'undefined'){
          // find any adjacent node to this nodes[i]
          var adjNode = {x:area.centerX, y:area.centerY};
          for(var j in edges){
            if(edges[j].source == nodes[i].id) adjNode = hintMapping.mapping[edges[j].target];
            if(edges[j].target == nodes[i].id) adjNode = hintMapping.mapping[edges[j].source];
          }

          // place unmapped node in random place around adjacent node
          var angle = Math.random()*6.28;
          x = radius*Math.cos(angle);
          x = x + adjNode.x;
          if(x < (area.centerX-area.width/2) || x > (area.centerX+area.width/2)) x = 2*adjNode.x - x;

          y = radius*Math.sin(angle);
          y = y + adjNode.y;
          if(y < (area.centerY - area.height/2) || y > (area.centerY + area.height/2)) y = 2*adjNode.y - y;

          hintMapping.mapping[nodes[i].id] = {id: nodes[i].id, x:x, y:y};
        }
      }

      // remove from hintMapping nodes that are not exist in model
      for(var i in hintMapping.mapping){
        if(typeof(nodes[hintMapping.mapping[i].id]) == 'undefined') delete hintMapping.mapping[i];
      }

      return hintMapping;
    }

    if(GRASP.getObjectLength(nodes) == 0){
      var mapping = {area:this.area, mapping:{}};
      return mapping;
    }

    // In a special case when hint is null and there is only one node in graph, place it in the center of area
    if(GRASP.getObjectLength(nodes) == 1){
      var nodeIds = GRASP.getObjectKeys(nodes);
      var mapping = {area:{}, mapping:{}};
      mapping['area'] = this.area;
      mapping['mapping'][nodeIds[0]] = {id:nodeIds[0], x:this.area.centerX, y:this.area.centerY};
      return mapping;
    }

    // Case when we have no hint mapping and there are more than on node - use force directed layout to place nodes
    // create point from nodes
    var x, y, i, sector = Math.PI/GRASP.getObjectLength(nodes), count = 0;
    var hasUnmappedNodesInHint = false;
    var isFixedPosition;
    for(i in nodes){
      if(hintMapping && typeof(hintMapping.mapping[nodes[i].id]) != 'undefined'){
        x = hintMapping.mapping[nodes[i].id].x;
        y = hintMapping.mapping[nodes[i].id].y;
        isFixedPosition = true;
      }else{
        hasUnmappedNodesInHint = true;
        x = Math.cos(sector*count);
        y = Math.sin(sector*count);
        isFixedPosition = false;
      }
      this.points[nodes[i].id] = new GRASP.GraphNodeMappingForceDirected.Point(new GRASP.Vector(x,y), 1.0, isFixedPosition);
      count++;
    }

    // if hint has all nodes, just return the hint
    if(!hasUnmappedNodesInHint) return hintMapping;

    // create springs from edges
    for(i in edges){
      var edge = edges[i];
      var p1 = this.points[edge.source];
      var p2 = this.points[edge.target];
      this.springs.push(new GRASP.GraphNodeMappingForceDirected.Spring(p1, p2, 1.0, 100.0));
    }

    // main loop
    var k = 1, p, c = 0;
    while(k > 0.01 && c<50){
      this.applyCoulombsLaw();
      this.applyHookesLaw();
      this.updateVelocity(0.05);
      this.updatePosition(0.05);

      // calculate kinetic energy of system
      k = 0.0;
      for(i in this.points){
        p = this.points[i];
        var speed = p.v.magnitude();
        k += speed * speed;
      }
      c++;
    }


    // Adjust force mapping to this.area
    var coords = {};
    for(i in nodes) coords[nodes[i].id] = {id:nodes[i].id, x:this.points[nodes[i].id].p.x, y:this.points[nodes[i].id].p.y};
    var _node_mapping = this.adjustToArea(coords, nodeLabelAreaList, this.area);

    // now shake nodes so that labels do not overlap
    var c = 0;
    var all_intersect_track = []; // array of overall node label overlapping for each step
    var offset = {};
    while(c < 50){
      all_intersect_track[c] = 0;
      if(c>2 && all_intersect_track[c-1] == all_intersect_track[c-2] == all_intersect_track[c-3] == all_intersect_track[c-4]) break;

      // calc node repulsion offsets based on node labels intersection
      for(var i in _node_mapping){
        offset[i] = {};
        for(var j  in _node_mapping){
          offset[i][j] = {x:0, y:0};
          if(i == j) continue;

          var r1 = {x:_node_mapping[i].x, y:_node_mapping[i].y, width:nodeLabelAreaList[_node_mapping[i].id].width, height:nodeLabelAreaList[_node_mapping[i].id].height};
          var r2 = {x:_node_mapping[j].x, y:_node_mapping[j].y, width:nodeLabelAreaList[_node_mapping[j].id].width, height:nodeLabelAreaList[_node_mapping[j].id].height};
          var intersect = GRASP.calcRectIntersection(r1, r2);

          all_intersect_track[c] += intersect.y;

          if(intersect.y != 0){
            if(r1.y < r2.y){
              offset[i][j].y = -Math.floor(3*intersect.y/2);
            }else{
              offset[i][j].y = Math.floor(3*intersect.y/2);
            }
            // If r1.y == r2.y we will end up with offset[i][j].y == offset[j][i].y
            // so that both labels will stay in  place.
            // Avoid this with this ad hoc condition.
            if(offset[j] && offset[i][j].y == offset[j][i].y){
              offset[i][j].y = -offset[i][j].y;
            }
          }
        }
      }

      // we calculated all offsets, now apply it to nodes
      for(var i in offset){
        var nodeTopOffset = 0;
        var nodeBottomOffset = 0;
        for(var j  in offset[i]){
          if(offset[i][j].y > 0) nodeTopOffset = Math.max(nodeTopOffset, offset[i][j].y);
          if(offset[i][j].y < 0) nodeBottomOffset = Math.min(nodeBottomOffset, offset[i][j].y);
        }
        _node_mapping[i].y = _node_mapping[i].y + nodeTopOffset + nodeBottomOffset;
      }
      c++;
    } // end of node shaking for label non-overlap

    // Adjust to this.area once again
    _node_mapping = this.adjustToArea(_node_mapping, nodeLabelAreaList, this.area);

    // create obj that implements iMapping
    var mapping = {
      area: this.area,
      mapping: _node_mapping
    };

    return mapping;
  },

  // --- PRIVATE FUNCTIONS ---

  // points are slightly repulsed by other points
  applyCoulombsLaw: function(){
    var i, j, point1, point2, that = this, ke = 100.0; // repulsion constant

    for(i in this.points){
      point1 = this.points[i];
      for(j in this.points){
        point2 = this.points[j];
        if (point1 !== point2){
          var d = point1.p.subtract(point2.p);
          var distance = d.magnitude() + 1.0;
          var direction = d.normalise();

          // apply force to each end point
          point1.applyForce(direction.multiply(ke).divide(distance * distance * 0.5));
          point2.applyForce(direction.multiply(ke).divide(distance * distance * -0.5));
        }
      }
    }
  },

  updateVelocity: function(timestep){
    var i, p, damping = 0.5; // damping constant, points lose velocity over time
    for(i in this.points){
      p = this.points[i];
      p.v = p.v.add(p.f.multiply(timestep)).multiply(damping);
      p.f = new GRASP.Vector(0,0);
    }
  },

  updatePosition: function(timestep){
    var i, p;
    for(i in this.points){
      p = this.points[i];
      if(!p.p.isFixedPosition) p.p = p.p.add(p.v.multiply(timestep));
    }
  },

  applyHookesLaw: function(){
    this.springs.forEach(function(s){
      var d = s.point2.p.subtract(s.point1.p); // the direction of the spring
      var displacement = s.length - d.magnitude();
      var direction = d.normalise();

      // apply force to each end point
      s.point1.applyForce(direction.multiply(s.k * displacement * -0.5));
      s.point2.applyForce(direction.multiply(s.k * displacement * 0.5));
    });
  },

  adjustToArea: function(points, nodeLabelAreaList, targetArea){
    var i, x, y, area, ta = GRASP.clone(targetArea);
    // calc max label height
    var maxLabelHeight = 0;
    for(i in nodeLabelAreaList){
      if(nodeLabelAreaList[i].height > maxLabelHeight) maxLabelHeight = nodeLabelAreaList[i].height;
    }

    // get max coord of all nodes
    var maxX = Number.NEGATIVE_INFINITY;
    var maxY = Number.NEGATIVE_INFINITY;
    var minX = Number.POSITIVE_INFINITY;
    var minY = Number.POSITIVE_INFINITY;
    for(i in points){
      x = points[i].x;
      y = points[i].y;

      if(x > maxX) maxX = x;
      if(y > maxY) maxY = y;
      if(x < minX) minX = x;
      if(y < minY) minY = y;
    }

    // scale nodes coordinates
    area = {centerX:(minX+(maxX-minX)/2), centerY:(minY+(maxY-minY)/2), width:(maxX-minX), height:(maxY-minY)};
    ta.height -= 2*maxLabelHeight;
    ta.width -= 2*maxLabelHeight;
    var m = GRASP.MappingHelper.adjustMappingToArea({mapping:points, area:area}, ta);

    var _node_mapping = {};
    for(i in points){
      _node_mapping[points[i].id] = {id:points[i].id, x: m.mapping[i].x, y:m.mapping[i].y};
    }

    return _node_mapping;
  }

};

GRASP.GraphNodeMappingForceDirected.Point = function(position, mass, isFixedPosition){
  this.p = position; // position
  this.m = mass;     // mass
  this.v = new GRASP.Vector(0, 0); // velocity
  this.f = new GRASP.Vector(0, 0); // force
  this.isFixedPosition = isFixedPosition;
};

GRASP.GraphNodeMappingForceDirected.Point.prototype = {
  applyForce: function(force){
    if(!this.isFixedPosition) this.f = this.f.add(force.divide(this.m));
  }
};

GRASP.GraphNodeMappingForceDirected.Spring = function(point1, point2, length, k){
  this.point1 = point1;
  this.point2 = point2;
  this.length = length; // spring length at rest
  this.k = k; // spring constant (See Hooke's law) .. how stiff the spring is
};