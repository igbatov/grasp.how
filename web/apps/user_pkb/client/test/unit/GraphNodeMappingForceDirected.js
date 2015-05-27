describe("GraphNodeMappingForceDirected.getMapping", function(){
  beforeEach(function(){
    //Craft mock of 'GraphModelTree' object for simple case of graph:
    var nodes = {
      1:{id:1, nodeContentId:"1", isRoot:true},
      2:{id:2, nodeContentId:"2", isRoot:false},
      3:{id:3, nodeContentId:"3", isRoot:false}
    };

    var edges = {
      1:{id:1, source:1, target:2, isSkeleton:true, edgeContentId:"1"},
      2:{id:2, source:1, target:3, isSkeleton:true, edgeContentId:"2"}
    };

    this.model = new YOVALUE.GraphModelTree(new YOVALUE.GraphModel('testGraph'));
    this.model.init('testGraph', ['text'], ['link'], 'text', 'link', true);
    this.model.setGraphElements({nodes:nodes, edges:edges});

    this.nodeMapper = new YOVALUE.GraphNodeMappingForceDirected();
  });

  it("should set coordinates for graph nodes according to force-layout", function () {
    var nodes = this.nodeMapper.getMapping(this.model.getNodes(), this.model.getEdges(), {});
    expect(nodes).toEqual({
      area : { centerX : 0, centerY : 0, width : 400, height : 400 },
      mapping: {
          1 : { id : 1, x : 35, y : 57 },
          2 : { id : 2, x : 175, y : 137 },
          3 : { id : 3, x : -108, y : -16 }
      }
    });
  });
});