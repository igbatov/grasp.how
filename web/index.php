<?php
//header('HTTP/1.1 401 Unauthorized'); exit();
//phpinfo(); exit();
require_once ('lib/server/bootstrap.php');

// init application
switch($c->getWebDomainName()){
  case 'my.grasp.how':
  case 'grasp.local':
    $app = new AppUserPkb($c, $s, $db, $logger, $i18n, $oauth);
    break;
  default:
    $app = new AppFrontend($c, $s, $db, $logger, $i18n, $oauth);
    break;
}

$app->preAccessLog();
$app->showView();
$app->postAccessLog();
?>


<script>
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
</script>