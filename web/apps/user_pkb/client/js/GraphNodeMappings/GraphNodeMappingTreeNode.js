
YOVALUE.GraphNodeMappingTreeNode = function(args){
  this._id = args.id;
  this._x = args.x;
  this._y = args.y;
  this._size = args.size;
  //calculated values
  this._sector_begin_angle = 0,
  this._sector_turn = 2*Math.PI;
}

YOVALUE.GraphNodeMappingTreeNode.prototype = {
  clone: function(){
    var node = new YOVALUE.GraphNodeMappingTreeNode({
      'id': this.getId(),
      'x': this.getX(),
      'y': this.getY(),
      'size': this.getSize()
    });

    node.setSectorBeginAngle(this.getSectorBeginAngle());
    node.setSectorTurn(this.getSectorTurn());

    return node;
  },

  getId: function(){
    return this._id;
  },

  getX: function(){
    return parseFloat(this._x);
  },
  setX: function(value){
    this._x = value;
  },

  getY: function(){
    return parseFloat(this._y);
  },
  setY: function(value){
    this._y = value;
  },

  getR: function(){
    return Math.sqrt(this._x*this._x + this._y*this._y);
  },

  getQ: function(){
    var q = this.getR()>0 ? Math.acos(this._x/this.getR()) : 0;
    return this._y > 0 ? q : -q;
  },

  setR: function(r){
    var const_q = this.getQ();
    this._x = r*Math.cos(const_q);
    this._y = r*Math.sin(const_q);
  },

  setQ: function(q){
    var r = this.getR();
    this._x = r*Math.cos(q);
    this._y = r*Math.sin(q);
  },

  setSectorBeginAngle: function(value){
    this._sector_begin_angle = value;
    this._updateQFromSector();
  },
  getSectorBeginAngle: function(){
    return this._sector_begin_angle;
  },

  setSectorTurn: function(value){
    this._sector_turn = value;
    this._updateQFromSector();
  },
  getSectorTurn: function(){
    return this._sector_turn;
  },

  _updateQFromSector: function(){
    this.setQ(this.getSectorBeginAngle() + this.getSectorTurn()/2)
  }
}
