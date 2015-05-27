var canvasDrawerTest = {};
canvasDrawerTest.beforeEach = function(){
  this.addMatchers(imagediff.jasmine);
  var canvasContainer = document.createElement('div');
  // canvasContainer.style.cssText = "display:none;";
  canvasContainer.id = "testCanvas";
  canvasContainer.width = 200;
  canvasContainer.height = 200;
  document.getElementsByTagName("body")[0].appendChild(canvasContainer);

  this.canvasDrawer = new YOVALUE.CanvasDrawer(Kinetic, canvasContainer.id, canvasContainer.width, canvasContainer.height, jQuery);

  this.layerId = this.canvasDrawer.addLayer('test');

};

canvasDrawerTest.afterEach = function(){
  var element = document.getElementById("testCanvas");
  // element.parentNode.removeChild(element);
};

describe("CanvasDrawer.bindStage", function () {
  beforeEach(function(){
    canvasDrawerTest.beforeEach.apply(this);
  });

  it("should be able to bind callback to mousemove event in canvas area", function (){
    var cb = jasmine.createSpy('callback');
    var el = this.canvasDrawer.getStage().getContent();
    this.canvasDrawer.drawLayer(this.layerId);
    var bindId = this.canvasDrawer.bindStage('mousemove', cb, {centerX:10, centerY:10, width:5, height:5});

    //call callback if we moved mouse to area
    jasmineCanvasDrawerEventSimulation.simulate(el, 'mousemove', {x:10, y:10});
    expect(cb).toHaveBeenCalledWith(jasmine.any(Object));

    //do not call callback if we moved mouse outside area
    cb.reset();
    jasmineCanvasDrawerEventSimulation.simulate(el, 'mousemove', {x:3, y:3});
    expect(cb).not.toHaveBeenCalled();

    //do not call callback if we unbinded it
    this.canvasDrawer.unbindStage(bindId);
    jasmineCanvasDrawerEventSimulation.simulate(el, 'mousemove', {x:10, y:10});
    expect(cb).not.toHaveBeenCalled();
  });

  afterEach(function(){
    canvasDrawerTest.afterEach.apply(this);
  })
});

describe("CanvasDrawer.bindShape", function () {
  beforeEach(function(){
    canvasDrawerTest.beforeEach.apply(this);

    this.circle = new YOVALUE.CanvasDrawer.Circle({
      id: 1,
      x: 100,
      y: 100,
      radius: 70,
      fill: 'blue',
      draggable: true
    });
    this.canvasDrawer.addShape(this.layerId, this.circle);
    this.canvasDrawer.drawLayer(this.layerId);
  });

  it("should be able to bind callback to shape mouseenter", function (){
    var cb = jasmine.createSpy('callback');

    var bindId = this.canvasDrawer.bindShape('mouseenter', this.circle, cb);

    //call callback if we moved mouse to area
    var el = this.canvasDrawer.getStage().getContent();
    jasmineCanvasDrawerEventSimulation.simulate(el, 'mousemove', {x:100, y:100});
    expect(cb).toHaveBeenCalledWith(jasmine.any(Object));

    //do not call callback if we moved mouse outside area
    cb.reset();
    jasmineCanvasDrawerEventSimulation.simulate(el, 'mousemove', {x:3, y:3});
    expect(cb).not.toHaveBeenCalled();

    //do not call callback after it was unbinded
    this.canvasDrawer.unbindShape(bindId);
    jasmineCanvasDrawerEventSimulation.simulate(el, 'mousemove', {x:100, y:100});
    expect(cb).not.toHaveBeenCalled();
  });

  it("should be able to bind callback to shape mouseleave", function (){
    var cb = jasmine.createSpy('callback');

    this.canvasDrawer.bindShape('mouseleave', this.circle, cb);

    //do not call callback on mouse enter to shape
    var el = this.canvasDrawer.getStage().getContent();
    jasmineCanvasDrawerEventSimulation.simulate(el, 'mousemove', {x:100, y:100});
    expect(cb).not.toHaveBeenCalled();

    //call callback on mouse leave the shape
    jasmineCanvasDrawerEventSimulation.simulate(el, 'mousemove', {x:3, y:3});
    expect(cb).toHaveBeenCalledWith(jasmine.any(Object));
  });

  afterEach(function(){
    canvasDrawerTest.afterEach.apply(this);
  })

});

describe("CanvasDrawer.getIntersection", function () {
  beforeEach(function(){
    canvasDrawerTest.beforeEach.apply(this);

    this.circle1 = new YOVALUE.CanvasDrawer.Circle({
      id: 1,
      x: 100,
      y: 100,
      radius: 10,
      fill: 'blue'
    });

    this.text1 = new YOVALUE.CanvasDrawer.Text({
      text: '1',
      x: 92,
      y: 85 ,
      fontSize: 30,
      fontFamily: 'Calibri',
      fill: 'green'
    });

    this.layer2Id = this.canvasDrawer.addLayer('test2');

    this.canvasDrawer.addShape(this.layerId, this.circle1);
    this.canvasDrawer.addShape(this.layer2Id, this.text1);
    this.canvasDrawer.drawLayer(this.layerId);
    this.canvasDrawer.drawLayer(this.layer2Id);
  });

  it("should return all shapes under given point", function () {
    var shapes = this.canvasDrawer.getIntersections(100, 100);
    expect(shapes.length).toEqual(2);
  });

  afterEach(function(){
    canvasDrawerTest.afterEach.apply(this);
  })
});

describe("CanvasDrawer.addShape", function () {
  beforeEach(function(){
    canvasDrawerTest.beforeEach.apply(this);
  });

  it("should draw circle", function () {
    var circle = new YOVALUE.CanvasDrawer.Circle({
      id: 1,
      x: 100,
      y: 100,
      radius: 70,
      fill: 'blue'
    });
    this.canvasDrawer.addShape(this.layerId, circle);
    this.canvasDrawer.drawLayer(this.layerId);

    jasmineCanvasDrawerExt.isCanvasEqualToImage(this.canvasDrawer, YOVALUE.TestFixtures.CanvasDrawer[0]);
  });

  it("shape should be draggable if attr 'draggable' is true", function () {
    var circle = new YOVALUE.CanvasDrawer.Circle({
      id: 1,
      x: 100,
      y: 100,
      radius: 70,
      fill: 'blue',
      draggable: true
    });
    this.canvasDrawer.addShape(this.layerId, circle);
    this.canvasDrawer.drawLayer(this.layerId);

    var el = this.canvasDrawer.getStage().getContent();
    jasmineCanvasDrawerEventSimulation.drag(el, {x:100, y:100}, {x:100, y:1});
    jasmineCanvasDrawerExt.isCanvasEqualToImage(this.canvasDrawer, YOVALUE.TestFixtures.CanvasDrawer[3]);
  });

  it("should draw text", function () {
    var text = new YOVALUE.CanvasDrawer.Text({
      id: 1,
      graphId: 'graphId',
      x: 50,
      y: 50,
      text: 'Text for CanvasDrawer test',
      fontSize: 10,
      fontFamily: 'Calibri',
      fill: 'black'
    });
    this.canvasDrawer.addShape(this.layerId, text);
    this.canvasDrawer.drawLayer(this.layerId);

    jasmineCanvasDrawerExt.isCanvasEqualToImage(this.canvasDrawer, YOVALUE.TestFixtures.CanvasDrawer[1]);
  });

  it("should draw path", function () {
    var path = new YOVALUE.CanvasDrawer.Path({
      id: 1,
      data: 'M10,100Q100,50,190,100',
      stroke: 'blue'
    });
    this.canvasDrawer.addShape(this.layerId, path);
    this.canvasDrawer.drawLayer(this.layerId);

    jasmineCanvasDrawerExt.isCanvasEqualToImage(this.canvasDrawer, YOVALUE.TestFixtures.CanvasDrawer[2]);
  });

  it("should draw image", function () {
    var imageObj = new Image();
    imageObj.src = YOVALUE.TestFixtures.CanvasDrawer[4];
    var img = new YOVALUE.CanvasDrawer.Image({
      x: 0,
      y: 0,
      image: imageObj,
      width: 10,
      height: 10,
      // fill: args.color,
      draggable: true
    });

    waitsFor(function () {
      return imageObj.complete;
    });

    runs(function () {
      this.canvasDrawer.addShape(this.layerId, img);
      this.canvasDrawer.drawLayer(this.layerId);

      img.setSize({width:200, height:200});
      this.canvasDrawer.drawLayer(this.layerId);

      jasmineCanvasDrawerExt.isCanvasEqualToImage(this.canvasDrawer, YOVALUE.TestFixtures.CanvasDrawer[4]);
    });
  });

  afterEach(function(){
    canvasDrawerTest.afterEach.apply(this);
  })
});
