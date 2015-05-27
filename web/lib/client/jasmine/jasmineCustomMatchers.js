beforeEach(function(){

  function replacer(k, v) {
    if (typeof v === 'function') {
      v = v.toString();
    } else if (window['File'] && v instanceof File) {
      v = '[File]';
    } else if (window['FileList'] && v instanceof FileList) {
      v = '[FileList]';
    }
    return v;
  }

  this.addMatchers({
    toBeJsonEqual: function(expected){
      var one = JSON.stringify(this.actual, replacer).replace(/(\\t|\\n)/g,''),
        two = JSON.stringify(expected, replacer).replace(/(\\t|\\n)/g,'');

      return one === two;
    }
  });
});