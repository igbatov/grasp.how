(function(){
  var iframe = document.createElement('iframe');
  iframe.class = 'grasphow-iframe';
  iframe.src = 'http://www.grasp.how/embed/[<?php echo $graphIds; ?>]';
  iframe.style = 'border: 0; width: 100%; height: 600px;';
  iframe.onload = function(){
    this.contentWindow.postMessage({from:document.location.href}, "http://www.grasp.how/embed/[<?php echo $graphIds; ?>]");
  };
  var el = document.getElementById('<?php echo $uniqId; ?>');
  el.append(iframe);
})()