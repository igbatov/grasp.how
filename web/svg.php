<!doctype html>
<head>
  <meta http-equiv="content-type" content="text/html; charset=UTF-8">
  <script src="../lib/client/jquery.js"></script>
  <script src="../../apps/user_pkb/client/js/Helpers.js"></script>
  <script src="../../apps/user_pkb/client/js/Drawer/SVGDrawer.js"></script>
</head>
<body>

<script>

  $( document ).ready(function() {
    var drawer = new YOVALUE.SVGDrawer('container', 1000, 1000);
    drawer.addLayer('layerOne');
//    var shape1 = drawer.createShape('circle', {x:100, y:100, radius:50, color:'blue'});
  //  var shape1 = drawer.createShape('rectangle', {x:100, y:100, width:50, height:50, color:'blue'});
  //  drawer.addShape('layerOne', shape1);
    var shape2 = drawer.createShape('rectangle', {x:0, y:0, width:0, height:0, fill:'red'});
    drawer.addShape('layerOne', shape2);
    shape2.setXY({x:120, y:100});
    shape2.setWidth(50);
    shape2.setHeight(50);
    shape2.setDraggable(true);

    var step = 50;
    for(var i=0; i<=1; i++){
      var shape3 = drawer.createShape('circle', {x:10+step*i, y:10+step*i, radius:10, fill:'green', opacity:0.2});
      drawer.addShape('layerOne', shape3);
      shape3.setDraggable(true);
      var shape4 = drawer.createShape('path', {x:10+step*i, y:10+step*i, data:'M 100 350 q 150 -300 300 0', fill:'none', stroke:'blue', strokeWidth:2});
      drawer.addShape('layerOne', shape4);
      var shape5 = drawer.createShape('text', {x:10+step*i, y:10+step*i, text:'Привет всем!', fill:'black'});
      drawer.addShape('layerOne', shape5);
      shape5.setPointerEvents('none');

    }

    var p = shape5.getBBox();

    var shape6 = drawer.createShape('rectangle', {x:p.x, y:p.y, width:p.width, height:p.height, fill:'none', stroke:'blue', strokeWidth:2});
    drawer.addShape('layerOne', shape6);
    drawer.bindShape('mouseenter', shape2, function(e){
      console.log(e);
    });
 //   shape2.setDraggable(true);
   // shape2.setY(200);
    var intersections = drawer.getIntersections(120,100);
    console.log(intersections);
    //for(var i in intersections)  console.log(intersections[i]);

    drawer.bindStageMove(function(e){
      //console.log(e);
    }, {centerX:120, centerY:100, width:50, height:50})
  });

/*--------------------------------------*/

</script>
<div id="padding" style="height:50px; border: 2px;"></div>
<div id="container"></div>

</body>
</html>
