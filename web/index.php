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