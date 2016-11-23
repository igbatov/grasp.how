describe("GraphNodeMappingTree.getMapping", function(){
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

    this.model = new GRASP.GraphModelTree(new GRASP.GraphModel('testGraph'));
    this.model.init('testGraph', ['text'], ['link'], 'text', 'link', true);
    this.model.setGraphElements({nodes:nodes, edges:edges});

    this.nodeMapper = new GRASP.GraphNodeMappingTree();
  });

  it("should throw exception if model do not implement iGraphNodeMappingTreeModel", function () {
    var that = this;
    expect(function(){
      that.nodeMapper.getMapping({});
    }).toThrow(Error("Model do not implement iGraphNodeMappingTreeModel interface"));
  });

  it("should set coordinates for tree graph nodes in a Reinfold-Tiffold 'tidy' algorithm manner", function () {
    var nodes = this.nodeMapper.getMapping(this.model);
    expect(nodes).toEqual({
      area : { centerX : 0, centerY : 0, width : 400, height : 400 },
      mapping: {
        1: {id:1, size:20, x:0, y:0},
        2: {id:2, size:20, x:0, y:100},
        3: {id:3, size:20, x:0, y:-100}
      }
    });
  });
});