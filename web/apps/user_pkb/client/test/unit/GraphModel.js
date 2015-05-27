describe("GraphModel", function(){
  beforeEach(function(){
    //Craft graph model for tests
    var nodes = {
      1: {id:1, nodeContentId:"1"},
      2: {id:2, nodeContentId:"2"},
      3: {id:3, nodeContentId:"3"},
      4: {id:4, nodeContentId:"4"}
    };

    var edges = {
      1: {id:1, source:1, target: 2, edgeContentId:"1"},
      2: {id:2, source:1, target: 3, edgeContentId:"2"},
      3: {id:3, source:3, target: 4, edgeContentId:"3"},
      4: {id:4, source:4, target: 1, edgeContentId:"4"}
    };

    this.model = new YOVALUE.GraphModel(1);
    this.model.init('testGraph', ['text'], ['link'], 'text', 'link', true);
    this.model.setGraphElements({nodes:nodes, edges:edges});
  });

  it("getNodes should return unmodifiable nodes", function () {
    var node = this.model.getNode(1);
    node.id = 'newId';
    expect(node.id).toEqual(1);
  });

  it("getEdges should return unmodifiable edges", function () {
    var edge = this.model.getEdge(1);
    edge.id = 'newId';
    expect(edge.id).toEqual(1);
  });

  it("addNode should add node", function () {
    var c = this.model.addNode({'id':null, nodeContentId:"5"});
    expect(this.model.getNodes()).toBeJsonEqual({
      1: {id:1, nodeContentId:"1"},
      2: {id:2, nodeContentId:"2"},
      3: {id:3, nodeContentId:"3"},
      4: {id:4, nodeContentId:"4"},
      5: {id:5, nodeContentId:"5"}
    });
    expect(c).toBeJsonEqual({ nodes : { add : { 5 : { id : 5,  nodeContentId:"5"} }, remove : [ ] }, edges : { add : { }, remove : [ ], update : { } } });
  });

  it("addEdge should add edge", function () {
    var c = this.model.addEdge({'id':null, 'source':1, 'target': 4, edgeContentId:"5"});
    expect(this.model.getEdges()).toBeJsonEqual({
      1: {id:1, source:1, target: 2, edgeContentId:"1"},
      2: {id:2, source:1, target: 3, edgeContentId:"2"},
      3: {id:3, source:3, target: 4, edgeContentId:"3"},
      4: {id:4, source:4, target: 1, edgeContentId:"4"},
      5: {id:5, source:1, target: 4, edgeContentId:"5"}
    });
    expect(c).toBeJsonEqual({ nodes : { add : { }, remove : [ ] }, edges : { add : { 5 : { id : 5, source : 1, target : 4, edgeContentId:"5" } }, remove : [ ], update : { } } });
  });

  it("removeNode should remove node and all adjacent edges", function () {
    var c = this.model.removeNode(3);

    expect(this.model.getNodes()).toBeJsonEqual({
      1: {id:1, nodeContentId:"1"},
      2: {id:2, nodeContentId:"2"},
      4: {id:4, nodeContentId:"4"}
    });

    expect(this.model.getEdges()).toBeJsonEqual({
      1: {id:1, source:1, target: 2, edgeContentId:"1"},
      4: {id:4, source:4, target: 1, edgeContentId:"4"}
    });

    expect(c).toBeJsonEqual({ nodes : { add : { }, remove : [ 3 ] }, edges : { add : { }, remove : [ 3, 2 ], update : { } } });
  });

  it("getEdgesFromParentIds should return edge ids from parents", function () {
    var edgeIds;
    edgeIds = this.model.getEdgesFromParentIds(1);
    expect(edgeIds).toEqual([4]);

    edgeIds = this.model.getEdgesFromParentIds(4);
    expect(edgeIds).toEqual([3]);
  });

  it("getEdgesToChildIds should return edge ids to childs", function () {
    var edgeIds;
    edgeIds = this.model.getEdgesToChildIds(1);
    expect(edgeIds).toEqual([1,2]);

    edgeIds = this.model.getEdgesToChildIds(4);
    expect(edgeIds).toEqual([4]);
  });

  it("getShortestPaths should deliver shortest paths to every node", function () {
    var pathInfo = this.model.getShortestPaths(1);
    expect(pathInfo['lengths']).toEqual({'2':1, '3':1, '4':1, 1: 0});
    expect(pathInfo['paths']).toEqual({'2':[2], '3':[3], '4':[4], 1: []});
  });

  it("getNeighbourIds should deliver all adjacent nodes", function () {
    var neibIds = this.model.getNeighbourIds([1]);
    expect(neibIds).toEqual([4, 2, 3]);
  });
});


