window.onerror = function(m,f,l,c, e) {
  if (window.XMLHttpRequest) {
    var xhr = new XMLHttpRequest();
    var data = "msg="+encodeURIComponent(m)
        +"&url="+encodeURIComponent(f)
        +"&line="+l
        +"&col="+c
        +"&stack="+e.stack
        +"&href="+encodeURIComponent(window.location.href);
    xhr.open("GET", "/logger?"+data, true);
    xhr.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
    xhr.send();
  }
};