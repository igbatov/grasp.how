(function(){
  var el = document.getElementById('<?php echo $uniqId; ?>');
  var width = el.style.width ? el.style.width : '100%';
  var height = el.style.height ? el.style.height : el.offsetWidth*2/3+'px;';
  var iframe = document.createElement('iframe');
  iframe.class = 'grasphow-iframe';
  iframe.src = 'http://www.grasp.how/embed/<?php echo $graphIds; ?>';
  iframe.style = 'border: 0; width: '+width+'; height: '+height;
  iframe.onload = function(){
    this.contentWindow.postMessage({from:document.location.href}, "http://www.grasp.how/embed/<?php echo $graphIds; ?>");
  };
  el.append(iframe);
})()
