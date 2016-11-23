describe("GraphNodeMappingTreeNode", function(){
  beforeEach(function(){
    this.node = new GRASP.GraphNodeMappingTreeNode({
      'id':1,
      'x':50,
      'y': 50,
      'size':3
    });
  });

  it("should correctly convert R and Q change to X and Y", function () {
    this.node.setR(10);
    expect(this.node.getX()).toBe(7.071067811865474);
    this.node.setQ(0);
    expect(this.node.getX()).toBe(10);
  });

  it("should update Q when node sector is changed", function () {
    this.node.setSectorTurn(Math.PI/2);
    expect(this.node.getQ().toFixed(2)).toBe((Math.PI/4).toFixed(2));
  });
});


