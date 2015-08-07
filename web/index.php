<?php
//header('HTTP/1.1 401 Unauthorized'); exit();
require_once ('lib/server/bootstrap.php');

// init application
switch($c->getWebDomainName()){
  case 'my.grasp.how':
  case 'grasp.local':
    $app = new AppUserPkb($c, $s, $db, $eh);
    break;
  default:
    $app = new AppFrontend($c, $s, $db, $eh);
    break;
}

$app->showView();