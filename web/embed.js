(function(){
  try{
    var el = document.getElementById('grasp-how-501cb8beb66019e90ed669caadbe7ad4');
    if(el == null) return;
    var width = el.style.width ? el.style.width : '100%';
    var height = el.style.height ? el.style.height : el.offsetWidth*2/3+'px;';
    var iframe = document.createElement('iframe');
    iframe.scrolling = "no";
    iframe.class = 'grasphow-iframe';
    iframe.src = 'http://www.grasp.how/embed/' + el.children[0].src.split('=')[1] + '.html';
    iframe.style.width = width;
    iframe.style.height = height;
    iframe.style.border = '0';
    iframe.onload = function(){
      this.contentWindow.postMessage({from:document.location.href}, iframe.src);
    };
    el.appendChild(iframe);
  }catch(e){
    if (window.XMLHttpRequest) {
      var xhr = new XMLHttpRequest();
      var data = "msg="+encodeURIComponent(e.message)
        +"&url="
        +"&line="
        +"&col="
        +"&stack="+e.stack
        +"&href="+encodeURIComponent(window.location.href);
      xhr.open("GET", "http://www.grasp.how/logger?"+data, true);
      xhr.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
      xhr.send();
    }
  }
})()
