/**
 * Helper functions to compare canvas with image in tests
 * Uses imagediff library
 * TODO: as browser render canvas slightly different we need separate image set for every browser
 * For now image set is suited only for Chrome.
 * @type {Object}
 */
jasmineCanvasDrawerExt = {
  isCanvasEqualToImage: function(canvasDrawer, src){
    var canvasImg = new Image();
    canvasDrawer.getStageDataUrl('image/png', function(dataUrl){ canvasImg.src = dataUrl; });

    var refImg = new Image();
    refImg.src = src;

    waitsFor(function () {
      return canvasImg.src && refImg.complete;
    });

    var that = this;
    runs(function () {
      console.log(canvasImg.src);
      expect(canvasImg).toImageDiffEqual(refImg);
    });
  }
  /*
  _getImageDataFromImage: function (img) {
    // Create an empty canvas element
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    // Copy the image contents to the canvas
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
  */
};