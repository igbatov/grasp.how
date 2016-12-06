/*
<canvas id="canvas" style="border:2px solid black;" width="200" height="200">
</canvas>
*/
var data = "<svg xmlns='http://www.w3.org/2000/svg' height='100' width='100'><circle cx='50' cy='50' r='40' stroke='black' stroke-width='3' fill='red'/></svg>";
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
ctx.height = 200;
ctx.width = 200;

var DOMURL = window.URL || window.webkitURL || window;

var img = new Image();
img.crossOrigin="Anonymous";
var svg = new Blob([data], {type: 'image/svg+xml'});
var url = DOMURL.createObjectURL(svg);

img.onload = function () {
  ctx.drawImage(img, 0, 0);
  DOMURL.revokeObjectURL(url);
  var url = canvas.toDataURL('image/jpeg');
  console.log(url);
}

img.src = url;

document.body.appendChild(img);

