/**
 * This tests GraphView and CanvasView together.
 * This bundle should be able to draw graphs and fire
 * 'nodedragstop', 'nodeclick', ... on appropriate mouse actions
 */
describe("GraphView", function(){
  beforeEach(function () {
    this.addMatchers(imagediff.jasmine);

    var graphId = "testGraph";

    //create CanvasDrawer
    var canvasContainer = document.createElement('div');
    canvasContainer.id = "testCanvas";
    canvasContainer.width = 200;
    canvasContainer.height = 200;
    document.getElementsByTagName("body")[0].appendChild(canvasContainer);
    this.canvasDrawer = new YOVALUE.CanvasDrawer(Kinetic, canvasContainer.id, canvasContainer.width, canvasContainer.height, jQuery);

    this.graphView = new YOVALUE.GraphView(graphId, this.canvasDrawer, new YOVALUE.GraphViewNodeFactory(), new YOVALUE.GraphViewEdgeFactory(), new YOVALUE.GraphViewNodeLabelFactory());

    //init graphView with model and mapping
    var graphArea = {centerX:100, centerY:100, width:200, height:200};
    var nodeMapping = {
      area: graphArea,
      mapping: {1:{id:1, x:50, y:100}, 2:{id:2, x:150, y:100}}
    };
    var nodeLabelMapping = {
      area: graphArea,
      mapping: {1:{angle:0, x:50, y:100}, 2:{angle:0, x:150, y:100}}
    };

    var decoration = {
      scale: 250,
      nodeLabels: {1:{opacity: 1, size:20}, 2:{opacity: 1, size:20}},
      nodes: {1:{borderColor:"#5AB3A9", color:"#5AB3A9", opacity:1, size:10}, 2:{borderColor:"#5AB3A9", color:"#5AB3A9", opacity:1, size:10}},
      edges: {1:{borderColor:"blue", color:"blue", opacity:1, width: 1}}
    };

    var skin = {
     skinName: 'testSkin',
     skin: {
      node:{
        constructor: YOVALUE.GraphViewNodeImage,
        attr: {}
      },
      edge:{
        constructor: YOVALUE.GraphViewEdge,
        attr: {}
      },
      nodeLabel:{
        constructor: YOVALUE.GraphViewNodeLabel,
        attr: {'font':'Calibri', fill:'#BBBBBB', maxSize: 24}
      }}
    };

    this.graphView.setGraphArea(graphArea);
    this.graphView.setNodeMapping(nodeMapping);
    this.graphView.setNodeLabelMapping(nodeLabelMapping);
    this.graphView.setDecoration(decoration);
    this.graphView.setSkin(skin);
    this.graphView.setModel({
      nodes: {
        1: {id:1, label:"1", type:"text", icon: null, nodeContentId:1},
        2: {id:2, label:"2", type:"text", icon: null, nodeContentId:2}
      },
      edges: {
        1: {id:1, source:1, target:2, type:"link", edgeContentId:1}
      }
    });
  });

  afterEach(function () {
    var el = document.getElementById('testCanvas');
    //el.parentNode.removeChild(el);
  });

  // Test
  it('drawGraph.getTextArea should return text area dimensions', function () {
    var dims = this.graphView.getTextArea('Nice text on\ntwo strings', 20);
    expect(dims).toEqual({width: 98.017578125, height: 40});
  });

  it('drawGraph should draw graph', function () {
    this.graphView.drawGraph();
    jasmineCanvasDrawerExt.isCanvasEqualToImage(this.canvasDrawer, YOVALUE.TestFixtures.GraphView[0]);
  });

  it('drawGraph should correctly redraw graph if model was changed', function () {
    var nodeMapping = {
      area: {centerX:100, centerY:100, width:200, height:200},
      mapping: {2:{id:2, x:50, y:100}, 3:{id:3,  x:150, y:100}, 4:{id:4, x:100, y:50}}
    };

    var nodeLabelMapping = {
      area: {centerX:100, centerY:100, width:200, height:200},
      mapping: {2:{angle:0, x:50, y:100}, 3:{angle:0, x:150, y:100}, 4:{angle:0, x:100, y:50}}
    };

    var decoration = {
      scale: 250,
      nodeLabels: {2:{opacity: 1, size:20}, 3:{opacity: 1, size:20},4:{opacity: 1, size:20}},
      nodes: {2:{borderColor:"#5AB3A9", color:"#5AB3A9", opacity:1,  size:10}, 3:{borderColor:"#5AB3A9", color:"#5AB3A9", opacity:1, size: 10}, 4:{borderColor:"#5AB3A9", color:"#5AB3A9", opacity:1, size: 10}},
      edges: {1:{borderColor:"blue", color:"blue", opacity:1}, 2:{borderColor:"blue", color:"blue", opacity:1}, 3:{borderColor:"blue", color:"blue", opacity:1}}
    };

    this.graphView.setNodeMapping(nodeMapping);
    this.graphView.setNodeLabelMapping(nodeLabelMapping);
    this.graphView.setDecoration(decoration);
    this.graphView.setModel({
      nodes:  {
        2: {id:2, label:"222", data:"",  icon: null, type:"text"},
        3: {id:3, label:"333", data:"",  icon: null, type:"text"},
        4: {id:4, label:"444", data:"",  icon: null, type:"text"}
      },
      edges:  {
        1: {id:1, source:2, target:3, label:"1", data:"", type:"link"},
        2: {id:2, source:3, target:4, label:"2", data:"", type:"link"},
        3: {id:3, source:4, target:2, label:"3", data:"", type:"link"}
      }
    });

    this.graphView.drawGraph();
    jasmineCanvasDrawerExt.isCanvasEqualToImage(this.canvasDrawer, YOVALUE.TestFixtures.GraphView[1]);
  });

  it('node should resize on hover', function () {
    var im = new Image();
    im.src = YOVALUE.TestFixtures.CanvasDrawer[4];
    waitsFor(function () {
      return im.complete;
    });
    runs(function () {
      this.graphView.setModel({
        nodes: {
          1: {id:1, label:"yoda",  icon: im, type:"text", nodeContentId:1}
        },
        edges: {}
      });

      this.graphView.drawGraph();
    });
  });


  it('bind should bind callback to various mouse events', function () {
    var el = this.canvasDrawer.getStage().getContent();
    this.graphView.drawGraph();
    var cb1 = jasmine.createSpy('callback1');
    var cb2 = jasmine.createSpy('callback2');
   // var cb = function(e){console.log(e)};

    this.graphView.bind('clicknode', cb1);
    this.graphView.bind('clicknode', cb2);

    this.graphView.bind('dragstartnode', cb1);
    this.graphView.bind('dragstartnode', cb2);

    this.graphView.bind('dragendnode', cb1);
    this.graphView.bind('dragendnode', cb2);


    cb1.reset();
    cb2.reset();
    jasmineCanvasDrawerEventSimulation.simulate(el, 'click', {x:50, y:100});
    expect(cb1).toHaveBeenCalledWith( { graphId : 'testGraph', eventType : 'clicknode', elementType : 'node', element : { id : 1, icon: null, label : '1', type : 'text', nodeContentId : 1 } } );
    expect(cb2).toHaveBeenCalledWith( { graphId : 'testGraph', eventType : 'clicknode', elementType : 'node', element : { id : 1, icon: null, label : '1', type : 'text', nodeContentId : 1 } } );

    //node should react on click event if it is overlapped by label
    cb1.reset();
    jasmineCanvasDrawerEventSimulation.simulate(el, 'click', {x:54, y:105});
    expect(cb1).toHaveBeenCalledWith( { graphId : 'testGraph', eventType : 'clicknode', elementType : 'node', element : { id : 1, icon: null, label : '1', type : 'text', nodeContentId : 1 } } );

    cb1.reset();
    cb2.reset();

    jasmineCanvasDrawerEventSimulation.drag(el, {x:150, y:100}, {x:50, y:100});
    expect(cb1).toHaveBeenCalledWith({ graphId : 'testGraph', eventType : 'dragstartnode', elementType : 'node', element : { id : 2, icon: null, label : '2', type : 'text', nodeContentId : 2 } });
    expect(cb1).toHaveBeenCalledWith({ eventType : 'dragendnode', fromGraphId : 'testGraph',  draggedModelElement : { type : 'node', element : { id : 2, icon: null, label : '2', type : 'text', nodeContentId : 2 } }, droppedOnShapeIds : [ 81, 89, 85 ] });
    expect(cb2).toHaveBeenCalledWith({ graphId : 'testGraph', eventType : 'dragstartnode', elementType : 'node', element : { id : 2, icon: null, label : '2', type : 'text', nodeContentId : 2 } });
    expect(cb2).toHaveBeenCalledWith({ eventType : 'dragendnode', fromGraphId : 'testGraph', draggedModelElement : { type : 'node', element : { id : 2, icon: null, label : '2', type : 'text', nodeContentId : 2 } }, droppedOnShapeIds : [ 81, 89, 85 ] });

    cb1.reset();
    jasmineCanvasDrawerEventSimulation.drag(el, {x:150, y:100}, {x:50, y:100});
    expect(cb1).toHaveBeenCalledWith({ graphId : 'testGraph', eventType : 'dragstartnode', elementType : 'node', element : { id : 2, icon: null, label : '2', type : 'text', nodeContentId : 2 } });
    expect(cb1).toHaveBeenCalledWith({ eventType : 'dragendnode', fromGraphId : 'testGraph', draggedModelElement : { type : 'node', element : { id : 2, icon: null, label : '2', type : 'text', nodeContentId : 2 } }, droppedOnShapeIds : [ 81, 89, 85 ] });
  });

});
