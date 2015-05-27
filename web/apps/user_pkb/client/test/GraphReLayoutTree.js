describe("GraphTreeReLayouter", function(){
  beforeEach(function(){
    this.nodes = [];
    this.nodes.push(new YOVALUE.GraphModelNode({'id':'root', 'x':0, 'y':0, 'label':'root', 'data':null, 'color':'#000000', 'opacity':1, 'size':1, 'shape':'circle'}));
    this.nodes.push(new YOVALUE.GraphModelNode({'id':1, 'x':0, 'y':0, 'label':'1', 'data':null, 'color':'#000000', 'opacity':1, 'size':1, 'shape':'circle'}));
    this.nodes.push(new YOVALUE.GraphModelNode({'id':2, 'x':0, 'y':0, 'label':'2', 'data':null, 'color':'#000000', 'opacity':1, 'size':1, 'shape':'circle'}));

    this.edges = [];
    this.edges.push(new YOVALUE.GraphModelEdge({'id':1, 'source':'root', 'target':1, 'isSkeleton':true, 'label':'', 'color':'#000000', 'opacity':1, 'data':null}));
    this.edges.push(new YOVALUE.GraphModelEdge({'id':2, 'source':'root', 'target':2, 'isSkeleton':true, 'label':'', 'color':'#000000', 'opacity':1, 'data':null}));
  });

  it("should move selected node to center and adjust all other nodes accordingly", function () {
    var tree_model = new YOVALUE.GraphModelTree(this.nodes, this.edges);
    var layout =  new YOVALUE.GraphTreeLayouter(tree_model, 100, 0, 0);
    layout.createLayout();
    var morpher = new YOVALUE.GraphTreeReLayouter(tree_model, 100, 0, 0);
    morpher.morphLayout(1);

    var childs = tree_model.getRootNode().getChilds();

    expect(tree_model.getNode(1).getX()).toEqual(0); expect(tree_model.getNode(1).getY()).toEqual(0);
    expect(tree_model.getNode('root').getX()).toEqual(-50); expect(parseFloat(tree_model.getNode(1).getY().toFixed(0))).toEqual(0);
    expect(parseFloat(tree_model.getNode(2).getX().toFixed(0))).toEqual(0); expect(tree_model.getNode(2).getY()).toEqual(-100);
  });
});