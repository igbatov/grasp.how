YOVALUE.GraphFishEye = function(subscriber){
  this.subscriber = subscriber;
  this.subscriber.subscribe(this,[
    'get_fish_eyed_layout'
  ]);
};

YOVALUE.GraphFishEye.prototype = {
  eventListener: function(event){
    event.setResponse(this.apply(event.getData()['node_layout'], event.getData()['max_node_size'], event.getData()['radius'], event.getData()['center']));
  },

  apply: function(nodes, maxNodeSize, radius, center){
    var newDist, newSize, xDist, yDist, dist,
      power    = 2,
      powerExp = Math.exp(power);

    for(var i in nodes) {
      xDist = nodes[i].x - center.x;
      yDist = nodes[i].y - center.y;
      dist  = Math.sqrt(xDist*xDist + yDist*yDist);

      if(dist < radius){
        newDist = powerExp/(powerExp-1)*radius*(1-Math.exp(-dist/radius*power));
        newSize = powerExp/(powerExp-1)*radius*(1-Math.exp(-dist/radius*power));

        if(dist != 0){
          nodes[i].x = (center.x + xDist*(newDist/dist*3/4 + 1/4));
          nodes[i].y = (center.y + yDist*(newDist/dist*3/4 + 1/4));
        }

        nodes[i].size = maxNodeSize - ((maxNodeSize - nodes[i].size)/radius)*dist;
      }
    }

    return nodes;
  }
};



