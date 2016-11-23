describe("GraphModelTree", function(){
  beforeEach(function(){
    //Craft graph model for tests
    var nodes = {
      1: {id:1, nodeContentId:"1", isRoot:true},
      2: {id:2, nodeContentId:"2", isRoot:false},
      3: {id:3,  nodeContentId:"3", isRoot:false},
      4: {id:4,  nodeContentId:"4", isRoot:false},
      5: {id:5,  nodeContentId:"5", isRoot:false}
    };

    var edges = {
      1: {id:1, source:1, target: 2, isSkeleton:true, edgeContentId:"1"},
      2: {id:2, source:1, target: 3, isSkeleton:true, edgeContentId:"2"},
      3: {id:3, source:3, target: 4, isSkeleton:true, edgeContentId:"3"},
      4: {id:4, source:4, target: 1, isSkeleton:false, edgeContentId:"4"},
      5: {id:5, source:4, target: 5, isSkeleton:true,  edgeContentId:"5"}
    };

    this.model = new GRASP.GraphModelTree(new GRASP.GraphModel(1));
    this.model.init('testGraph', ['text'], ['link'], 'text', 'link', true);
    this.model.setGraphElements({nodes:nodes, edges:edges});
  });

  it("getSkeletonChildIds should deliver skeleton childs of node_id", function () {
    var c = this.model.getSkeletonChildIds(1);
    expect(c).toEqual([2,3]);
  });

  it("getPeripheryChildsCount should count leaves of a skeleton subtree", function () {
    var c;

    c = this.model.getPeripheryChildsCount(1);
    expect(c).toEqual(2);

    c = this.model.getPeripheryChildsCount(3);
    expect(c).toEqual(1);
  });

  it("getAllTreeChildIds should deliver all skeleton childs of node_id including subchilds", function () {
    var c = this.model.getAllTreeChildIds(1);
    expect(c).toEqual([2,3,4,5]);
  });

  it("getLevel should deliver level of the node starting from root", function () {
    var c;

    c = this.model.getLevel(3);
    expect(c).toEqual(1);

    c = this.model.getLevel(4);
    expect(c).toEqual(2);
  });

  it("applyChanges should correctly wire added nodes and edges based on virtual ids", function () {

    var c = this.model.applyChanges({
      nodes : { add : { newNode1: {} }, remove : [], update : {} },
      edges : { add : { newEdge1: {source:1, target:'newNode1'} }, remove : [], update : {} }
    });

    // check that new node exists
    var nodes = this.model.getNodes();
    expect(nodes[6]).toBeJsonEqual({id : 6, nodeContentId:"", isRoot : false});

    // check that edge 6 was rewired
    var edges = this.model.getEdges();
    expect(edges[6]).toBeJsonEqual({id:6, source:1, target:6, edgeContentId:"", isSkeleton:true});

    // check that return changes is correct
    expect(c).toBeJsonEqual({
      nodes : {
        add : { 6 : { id : 6, nodeContentId:"", isRoot : false } },
        remove : [ ]
      },
      edges : {
        add : { 6 : { id : 6, source : 1, target : 6, edgeContentId:"", isSkeleton : true } },
        remove : [ ],
        update : { }
      }
    });
  });

  it("applyChanges should relink childs of deleted nodes to its parent", function () {
    var c = this.model.applyChanges({
      nodes : { add : { }, remove : [ 4 ], update : {} },
      edges : { add : { }, remove : [], update : {} }
    });

    // check remaining nodes
    var i, nodes = this.model.getNodes(), nodeIds = [];
    for(i in nodes){
      nodeIds.push(nodes[i].id);
    }
    expect(nodeIds).toEqual([1,2,3,5]);

    // check  remaining edges
    var edges = this.model.getEdges(), edgeIds = [];
    for(i in edges){
      edgeIds.push(edges[i].id);
    }
    expect(edgeIds).toEqual([1,2,5]);

    // check that edge 5 was rewired
    expect(edges[5]).toBeJsonEqual({id:5, source:3, target:5, isSkeleton:true, edgeContentId:"5"});

    // check that return changes is correct
    expect(c).toBeJsonEqual({ nodes : { add : { }, remove : [ 4 ] }, edges : { add : { }, remove : [ 4, 3 ], update : { 5 : { source : 3 } } } });
  });

  it("applyChanges should refuse to remove skeleton edge", function () {
    var c = this.model.applyChanges({
      nodes : { add : { }, remove : [] },
      edges : { add : { }, remove : [1], update : {} }
    });

    // check that edge was not removed
    var edges = this.model.getEdges(), edgeIds = [];
    for(var i in edges){
      edgeIds.push(edges[i].id);
    }
    expect(edgeIds).toEqual([1,2,3,4,5]);
  });

  it("applyChanges should add no-skeleton edge between existing nodes", function () {
    var c = this.model.applyChanges({
      nodes : { add : {}, remove : [] },
      edges : { add : {newEdge: {source:2, target:3} }, remove : [], update : {} }
    });

    // check that edge 6 was added
    var edges = this.model.getEdges();
    expect(edges[6]).toBeJsonEqual({id : 6, source : 2, target : 3, edgeContentId:"", isSkeleton : false});
    expect(c).toBeJsonEqual({ nodes : { add : { }, remove : [ ] }, edges : { add : { 6 : { id : 6, source : 2, target : 3, edgeContentId:"", isSkeleton : false } }, remove : [ ], update : { } } });
  });

  it("applyChanges should rollback if changes breaks the tree", function () {
    var oldNodes = this.model.getNodes();
    var oldEdges = this.model.getEdges();
    var c = this.model.applyChanges({
      nodes : { add : { }, remove : [], update : {} },
      edges : { add : {newEdge: {source:2, target:3, isSkeleton:true} }, remove : [], update : {} }
    });

    // check that model was not changed
    expect(this.model.getNodes()).toBeJsonEqual(oldNodes);
    expect(this.model.getEdges()).toBeJsonEqual(oldEdges);
    expect(c).toBeJsonEqual({ nodes : { add : { }, remove : [ ] }, edges : { add : { }, remove : [ ], update : { } } });
  });

  it("applyChanges should accept isSkeleton attribute change", function () {
    // mark new edge as skeleton instead old one
    var c = this.model.applyChanges({
      nodes : { add : {}, remove : [], update : {} },
      edges : { add : { newEdge: {source:2, target:3} }, remove : [], update : { newEdge:{isSkeleton:true}, 2:{isSkeleton:false} } }
    });

    // check that model was changed
    expect(c).toBeJsonEqual({ nodes : { add : {}, remove : [ ] }, edges : { add : { 6: {id: 6, source:2, target:3, edgeContentId:"", isSkeleton : false } }, remove : [ ], update : { 2 : { isSkeleton : false }, 6 : { isSkeleton : true } } } });
  });

});
